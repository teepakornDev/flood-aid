import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSosIntake1795143600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE sos_requests (
        id uuid PRIMARY KEY,
        requester_id uuid REFERENCES users(id) ON DELETE SET NULL,
        tracking_token_hash char(64) NOT NULL UNIQUE,
        location geography(Point,4326) NOT NULL,
        accuracy_m double precision CHECK (accuracy_m BETWEEN 0 AND 100000),
        assistance_type varchar(12) NOT NULL CHECK (assistance_type IN ('EVACUATION','FOOD','WATER','MEDICAL')),
        people_count integer NOT NULL CHECK (people_count BETWEEN 1 AND 1000),
        priority varchar(10) NOT NULL DEFAULT 'UNASSESSED' CHECK (priority IN ('UNASSESSED','LOW','MEDIUM','HIGH','CRITICAL')),
        status varchar(16) NOT NULL DEFAULT 'SUBMITTED'
          CHECK (status IN ('SUBMITTED','TRIAGED','ASSIGNED','EN_ROUTE','RESOLVED','CANCELLED','UNABLE_TO_REACH')),
        description_encrypted bytea,
        contact_encrypted bytea,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query("CREATE INDEX idx_sos_requests_location ON sos_requests USING GiST (location)");
    await queryRunner.query("CREATE INDEX idx_sos_requests_status_created ON sos_requests (status, created_at, id)");
    await queryRunner.query(`
      CREATE TABLE sos_status_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sos_id uuid NOT NULL REFERENCES sos_requests(id),
        changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
        old_status varchar(16) CHECK (old_status IN ('SUBMITTED','TRIAGED','ASSIGNED','EN_ROUTE','RESOLVED','CANCELLED','UNABLE_TO_REACH')),
        new_status varchar(16) NOT NULL CHECK (new_status IN ('SUBMITTED','TRIAGED','ASSIGNED','EN_ROUTE','RESOLVED','CANCELLED','UNABLE_TO_REACH')),
        reason varchar(80) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query("CREATE INDEX idx_sos_status_history_case ON sos_status_history (sos_id, created_at, id)");
    await queryRunner.query(`
      CREATE TABLE idempotency_records (
        scope varchar(32) NOT NULL,
        key_hash bytea NOT NULL CHECK (octet_length(key_hash) = 32),
        request_hash bytea NOT NULL CHECK (octet_length(request_hash) = 32),
        response_ref uuid NOT NULL REFERENCES sos_requests(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,
        PRIMARY KEY (scope, key_hash)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE idempotency_records");
    await queryRunner.query("DROP TABLE sos_status_history");
    await queryRunner.query("DROP TABLE sos_requests");
  }
}
