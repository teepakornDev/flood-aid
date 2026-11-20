import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStaffAuth1795136400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(100) NOT NULL,
        email varchar(254) NOT NULL UNIQUE,
        password_hash text NOT NULL,
        role varchar(11) NOT NULL CHECK (role IN ('ADMIN', 'COORDINATOR', 'RESCUER')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE staff_sessions (
        token_hash bytea PRIMARY KEY CHECK (octet_length(token_hash) = 32),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query("CREATE INDEX idx_staff_sessions_expiry ON staff_sessions (expires_at)");
    await queryRunner.query("CREATE INDEX idx_staff_sessions_user ON staff_sessions (user_id)");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE staff_sessions");
    await queryRunner.query("DROP TABLE users");
  }
}
