import type { FloodModerationReport, FloodReviewStatus, VerificationStatus } from "@floodaid/contracts";
import { HttpException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";

type ReportRow = Omit<FloodModerationReport, "createdAt" | "observedAt"> & { createdAt: Date; observedAt: Date };

@Injectable()
export class FloodModerationRepository {
  private readonly logger = new Logger(FloodModerationRepository.name);

  constructor(private readonly database: DataSource) {}

  async list(status: VerificationStatus, cursor: string | undefined, limit: number): Promise<FloodModerationReport[]> {
    const rows = await this.run(() => this.database.query<ReportRow[]>(
      `SELECT r.id, r.severity, r.road_status AS "roadStatus", r.verification_status AS "verificationStatus",
              r.observed_at AS "observedAt", r.created_at AS "createdAt", r.description,
              ST_X(r.public_location) AS longitude, ST_Y(r.public_location) AS latitude
       FROM flood_reports r
       WHERE r.verification_status = $1
         AND ($2::uuid IS NULL OR (r.created_at, r.id) <
           (SELECT created_at, id FROM flood_reports WHERE id = $2))
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT $3`,
      [status, cursor ?? null, limit],
    ));
    return rows.map((row) => ({ ...row, observedAt: row.observedAt.toISOString(), createdAt: row.createdAt.toISOString() }));
  }

  transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.run(() => this.database.transaction("READ COMMITTED", work));
  }

  async status(manager: EntityManager, id: string, lock = false): Promise<VerificationStatus | undefined> {
    const [report] = await manager.query<{ verificationStatus: VerificationStatus }[]>(
      `SELECT verification_status AS "verificationStatus" FROM flood_reports WHERE id = $1 ${lock ? "FOR UPDATE" : ""}`,
      [id],
    );
    return report?.verificationStatus;
  }

  async updateStatus(manager: EntityManager, id: string, status: FloodReviewStatus): Promise<void> {
    await manager.query("UPDATE flood_reports SET verification_status = $2 WHERE id = $1", [id, status]);
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.warn("Flood report moderation database operation failed");
      throw new ServiceUnavailableException("Flood report moderation is temporarily unavailable.");
    }
  }
}
