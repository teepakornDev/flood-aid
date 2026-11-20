import type { CreateSosRequest, SosPrivateStatus } from "@floodaid/contracts";
import { HttpException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";

type StatusRow = Omit<SosPrivateStatus, "createdAt" | "updatedAt"> & { createdAt: Date; updatedAt: Date };
type RetryRow = { id: string; createdAt: Date; requestHash: Buffer; trackingTokenHash: string; canReplay: boolean };
interface NewCase {
  id: string;
  request: CreateSosRequest;
  trackingTokenHash: string;
  description: Buffer | null;
  contact: Buffer | null;
}

@Injectable()
export class SosRepository {
  private readonly logger = new Logger(SosRepository.name);

  constructor(private readonly database: DataSource) {}

  transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.run(() => this.database.transaction("READ COMMITTED", work));
  }

  async reserve(manager: EntityManager, id: string, keyHash: Buffer, requestHash: Buffer): Promise<boolean> {
    const [row] = await manager.query<{ response_ref: string }[]>(
      `INSERT INTO idempotency_records (scope, key_hash, request_hash, response_ref, expires_at)
       VALUES ('SOS_CREATE_V1', $1, $2, $3, now() + interval '24 hours')
       ON CONFLICT (scope, key_hash) DO NOTHING RETURNING response_ref`,
      [keyHash, requestHash, id],
    );
    return Boolean(row);
  }

  async retry(manager: EntityManager, keyHash: Buffer): Promise<RetryRow | undefined> {
    const [row] = await manager.query<RetryRow[]>(
      `SELECT s.id, s.created_at AS "createdAt", i.request_hash AS "requestHash",
              s.tracking_token_hash AS "trackingTokenHash", i.expires_at > statement_timestamp() AS "canReplay"
       FROM idempotency_records i JOIN sos_requests s ON s.id = i.response_ref
       WHERE i.scope = 'SOS_CREATE_V1' AND i.key_hash = $1`,
      [keyHash],
    );
    return row;
  }

  async create(manager: EntityManager, item: NewCase): Promise<Date> {
    const { location, assistanceType, peopleCount } = item.request;
    const [row] = await manager.query<{ createdAt: Date }[]>(
      `INSERT INTO sos_requests
         (id, tracking_token_hash, location, accuracy_m, assistance_type, people_count, description_encrypted, contact_encrypted)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, $6, $7, $8, $9)
       RETURNING created_at AS "createdAt"`,
      [item.id, item.trackingTokenHash, location.longitude, location.latitude, location.accuracyMeters ?? null,
        assistanceType, peopleCount, item.description, item.contact],
    );
    await manager.query(
      "INSERT INTO sos_status_history (sos_id, new_status, reason) VALUES ($1, 'SUBMITTED', 'INTAKE_RECEIVED')",
      [item.id],
    );
    return row.createdAt;
  }

  async status(id: string, tokenHash: string): Promise<SosPrivateStatus | undefined> {
    const [row] = await this.run(() => this.database.query<StatusRow[]>(
      `SELECT id, status, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM sos_requests WHERE id = $1 AND tracking_token_hash = $2`,
      [id, tokenHash],
    ));
    return row ? { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } : undefined;
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // Database diagnostics may include parameters. Only log a fixed message.
      this.logger.warn("Private SOS database operation failed");
      throw new ServiceUnavailableException("SOS is temporarily unavailable.");
    }
  }
}
