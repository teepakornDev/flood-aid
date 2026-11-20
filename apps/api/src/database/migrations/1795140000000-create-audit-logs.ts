import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuditLogs1795140000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id uuid,
        action varchar(64) NOT NULL,
        entity_type varchar(64) NOT NULL,
        entity_id uuid NOT NULL,
        result varchar(16) NOT NULL CHECK (result IN ('SUCCEEDED', 'DENIED', 'FAILED')),
        metadata_redacted jsonb NOT NULL CHECK (jsonb_typeof(metadata_redacted) = 'object'),
        occurred_at timestamptz NOT NULL DEFAULT now(),
        request_id uuid
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id, occurred_at DESC, id DESC)
    `);
    await queryRunner.query("CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id, occurred_at DESC)");
    await queryRunner.query(`
      CREATE INDEX idx_flood_reports_review_queue ON flood_reports (verification_status, created_at DESC, id DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX idx_flood_reports_review_queue");
    await queryRunner.query("DROP TABLE audit_logs");
  }
}
