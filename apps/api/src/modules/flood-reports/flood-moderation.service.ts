import type {
  FloodModerationPage, FloodReportReview, FloodReviewReason, FloodReviewRequest, FloodReviewStatus, StaffUser,
} from "@floodaid/contracts";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import type { FloodModerationQueryDto } from "./flood-moderation.dto";
import { FloodModerationRepository } from "./flood-moderation.repository";

const reasonsByStatus: Record<FloodReviewStatus, readonly FloodReviewReason[]> = {
  VERIFIED: ["FIELD_CONFIRMED", "TRUSTED_SOURCE"],
  REJECTED: ["INSUFFICIENT_EVIDENCE", "LOCATION_MISMATCH", "DUPLICATE_REPORT"],
};

@Injectable()
export class FloodModerationService {
  constructor(private readonly reports: FloodModerationRepository, private readonly audit: AuditService) {}

  async list(query: FloodModerationQueryDto): Promise<FloodModerationPage> {
    const limit = Number(query.limit ?? 20);
    const rows = await this.reports.list(query.status ?? "UNVERIFIED", query.cursor, limit + 1);
    return { reports: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1].id : null };
  }

  review(reportId: string): Promise<FloodReportReview> {
    return this.reports.transaction(async (manager) => {
      if (!await this.reports.status(manager, reportId)) throw new NotFoundException("Flood report not found.");
      return { reportId, decision: await this.audit.findFloodVerification(reportId, manager) };
    });
  }

  verify(reportId: string, actor: StaffUser, requestId: string | null, review: FloodReviewRequest): Promise<FloodReportReview> {
    if (!reasonsByStatus[review.verificationStatus].includes(review.reason)) {
      throw new BadRequestException("Choose a reason that matches the selected decision.");
    }

    return this.reports.transaction(async (manager) => {
      const current = await this.reports.status(manager, reportId, true);
      if (!current) throw new NotFoundException("Flood report not found.");
      if (current !== "UNVERIFIED") {
        const previous = await this.audit.findFloodVerification(reportId, manager);
        if (current === review.verificationStatus && previous?.actorId === actor.id && previous.reason === review.reason) {
          return { reportId, decision: previous };
        }
        throw new ConflictException("This flood report has already been reviewed.");
      }

      await this.reports.updateStatus(manager, reportId, review.verificationStatus);
      const decision = await this.audit.appendFloodVerification(manager, reportId, actor, requestId, review);
      return { reportId, decision };
    });
  }
}
