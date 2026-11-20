import type { StaffRole, StaffSession, StaffUser } from "@floodaid/contracts";
import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { DataSource } from "typeorm";

type Credentials = { id: string; name: string; role: StaffRole; passwordHash: string };
type SessionRow = StaffUser & { expiresAt: Date };

@Injectable()
export class AuthRepository {
  private readonly logger = new Logger(AuthRepository.name);

  constructor(private readonly database: DataSource) {}

  async credentials(email: string): Promise<Credentials | undefined> {
    const [account] = await this.query<Credentials>(
      'SELECT id, name, role, password_hash AS "passwordHash" FROM users WHERE email = $1',
      [email],
    );
    return account;
  }

  async issue(userId: string, passwordHash: string, tokenHash: Buffer, lifetimeMs: number): Promise<string | undefined> {
    await this.query("DELETE FROM staff_sessions WHERE expires_at <= now()", []);
    const [session] = await this.query<{ expiresAt: Date }>(
      `WITH account AS (
         SELECT id FROM users WHERE id = $1 AND password_hash = $2 FOR SHARE
       )
       INSERT INTO staff_sessions (user_id, token_hash, expires_at)
       SELECT id, $3, now() + $4 * interval '1 millisecond' FROM account
       RETURNING expires_at AS "expiresAt"`,
      [userId, passwordHash, tokenHash, lifetimeMs],
    );
    return session?.expiresAt.toISOString();
  }

  async session(tokenHash: Buffer): Promise<StaffSession | undefined> {
    const [row] = await this.query<SessionRow>(
      `SELECT u.id, u.name, u.role, s.expires_at AS "expiresAt"
       FROM staff_sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [tokenHash],
    );
    if (!row) return undefined;
    return { user: { id: row.id, name: row.name, role: row.role }, expiresAt: row.expiresAt.toISOString() };
  }

  async revoke(tokenHash: Buffer): Promise<void> {
    await this.query("DELETE FROM staff_sessions WHERE token_hash = $1", [tokenHash]);
  }

  async createAccount(email: string, name: string, role: StaffRole, passwordHash: string): Promise<boolean> {
    const [row] = await this.query<{ id: string }>(
      `INSERT INTO users (email, name, role, password_hash)
       VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id`,
      [email, name, role, passwordHash],
    );
    return Boolean(row);
  }

  async resetPassword(email: string, passwordHash: string): Promise<boolean> {
    try {
      return await this.database.transaction("READ COMMITTED", async (manager) => {
        const [account] = await manager.query<{ id: string }[]>(
          `WITH updated AS (
             UPDATE users SET password_hash = $2, updated_at = now() WHERE email = $1 RETURNING id
           )
           SELECT id FROM updated`,
          [email, passwordHash],
        );
        if (!account) return false;

        // The new statement also sees sessions issued before the update acquired the user lock.
        await manager.query("DELETE FROM staff_sessions WHERE user_id = $1", [account.id]);
        return true;
      });
    } catch {
      this.unavailable();
    }
  }

  private async query<Row>(sql: string, parameters: unknown[]): Promise<Row[]> {
    try {
      return await this.database.query<Row[]>(sql, parameters);
    } catch {
      this.unavailable();
    }
  }

  private unavailable(): never {
    this.logger.warn("Staff authentication database operation failed");
    throw new ServiceUnavailableException("Staff authentication is temporarily unavailable.");
  }
}
