import type { CreateFloodReport, FloodBounds, FloodReportFeature } from "@floodaid/contracts";
import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { DataSource } from "typeorm";

type ReceiptRow = { id: string; createdAt: Date };
export type PublicReportRow = Omit<FloodReportFeature["properties"], "source" | "observedAt" | "createdAt"> & {
  geometry: FloodReportFeature["geometry"];
  observedAt: Date;
  createdAt: Date;
};

const publicProjection = `
  id, severity, road_status AS "roadStatus", verification_status AS "verificationStatus",
  observed_at AS "observedAt", created_at AS "createdAt",
  ST_AsGeoJSON(public_location)::json AS geometry
`;

@Injectable()
export class FloodReportsRepository {
  private readonly logger = new Logger(FloodReportsRepository.name);

  constructor(private readonly database: DataSource) {}

  async save(report: CreateFloodReport, fingerprint: Buffer): Promise<ReceiptRow> {
    const { location, severity, roadStatus, description, observedAt } = report;
    const [inserted] = await this.query<ReceiptRow>(
      `INSERT INTO flood_reports
         (location, accuracy_m, severity, road_status, description, observed_at, submission_fingerprint)
       VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (submission_fingerprint) DO NOTHING
       RETURNING id, created_at AS "createdAt"`,
      [location.longitude, location.latitude, location.accuracyMeters ?? null,
        severity, roadStatus, description ?? null, observedAt, fingerprint],
    );
    if (inserted) return inserted;

    // A fresh statement sees a concurrent insert that won the unique constraint.
    const [existing] = await this.query<ReceiptRow>(
      'SELECT id, created_at AS "createdAt" FROM flood_reports WHERE submission_fingerprint = $1',
      [fingerprint],
    );
    if (!existing) throw new ServiceUnavailableException("Flood reports are temporarily unavailable.");
    return existing;
  }

  list(bounds: FloodBounds, since: Date, fetchLimit: number): Promise<PublicReportRow[]> {
    return this.query(
      `SELECT ${publicProjection}
       FROM flood_reports
       WHERE verification_status <> 'REJECTED' AND observed_at >= $5
         AND ST_Intersects(public_location, ST_MakeEnvelope($1, $2, $3, $4, 4326))
       ORDER BY observed_at DESC, id
       LIMIT $6`,
      [...bounds, since, fetchLimit],
    );
  }

  async find(id: string, since: Date): Promise<PublicReportRow | undefined> {
    const [report] = await this.query<PublicReportRow>(
      `SELECT ${publicProjection}
       FROM flood_reports
       WHERE id = $1 AND verification_status <> 'REJECTED' AND observed_at >= $2`,
      [id, since],
    );
    return report;
  }

  private async query<Row>(sql: string, parameters: unknown[]): Promise<Row[]> {
    try {
      return await this.database.query<Row[]>(sql, parameters);
    } catch {
      this.logger.warn("Flood report database operation failed");
      throw new ServiceUnavailableException("Flood reports are temporarily unavailable.");
    }
  }
}
