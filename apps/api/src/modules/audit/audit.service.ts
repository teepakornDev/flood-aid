import type { FloodReviewDecision, FloodReviewRequest, StaffUser } from "@floodaid/contracts";
import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";

type StoredVerification = Omit<FloodReviewDecision, "reviewedAt"> & { reviewedAt: Date };

@Injectable()
export class AuditService {
  constructor(private readonly database: DataSource) {}

  async appendFloodVerification(
    manager: EntityManager,
    reportId: string,
    actor: StaffUser,
    requestId: string | null,
    review: FloodReviewRequest,
  ): Promise<FloodReviewDecision> {
    const [entry] = await manager.query<{ id: string; reviewedAt: Date }[]>(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, result, metadata_redacted, request_id)
       VALUES ($1, 'FLOOD_REPORT_VERIFICATION', 'FLOOD_REPORT', $2, 'SUCCEEDED', $3::jsonb, $4)
       RETURNING id, occurred_at AS "reviewedAt"`,
      [actor.id, reportId, JSON.stringify({
        previousStatus: "UNVERIFIED", verificationStatus: review.verificationStatus, reason: review.reason,
      }), requestId],
    );
    return {
      id: entry.id, reviewedAt: entry.reviewedAt.toISOString(), actorId: actor.id, actorName: actor.name,
      verificationStatus: review.verificationStatus, reason: review.reason,
    };
  }

  async findFloodVerification(reportId: string, manager = this.database.manager): Promise<FloodReviewDecision | null> {
    const [entry] = await manager.query<StoredVerification[]>(
      `SELECT a.id, a.actor_id AS "actorId", u.name AS "actorName", a.occurred_at AS "reviewedAt",
              a.metadata_redacted->>'verificationStatus' AS "verificationStatus", a.metadata_redacted->>'reason' AS reason
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.entity_type = 'FLOOD_REPORT' AND a.entity_id = $1
         AND a.action = 'FLOOD_REPORT_VERIFICATION' AND a.result = 'SUCCEEDED'
       ORDER BY a.occurred_at DESC, a.id DESC LIMIT 1`,
      [reportId],
    );
    return entry ? { ...entry, reviewedAt: entry.reviewedAt.toISOString() } : null;
  }
}
