import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFloodReports1795132800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE flood_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id uuid,
        location geography(Point,4326) NOT NULL,
        public_location geometry(Point,4326) GENERATED ALWAYS AS
          (ST_SnapToGrid(location::geometry, 0.001)) STORED NOT NULL,
        accuracy_m double precision CHECK (accuracy_m BETWEEN 0 AND 100000),
        severity varchar(8) NOT NULL CHECK (severity IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
        road_status varchar(10) NOT NULL CHECK (road_status IN ('UNKNOWN', 'PASSABLE', 'IMPASSABLE')),
        verification_status varchar(10) NOT NULL DEFAULT 'UNVERIFIED'
          CHECK (verification_status IN ('UNVERIFIED', 'VERIFIED', 'REJECTED')),
        description varchar(500),
        observed_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        submission_fingerprint bytea NOT NULL UNIQUE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_flood_reports_public_location ON flood_reports USING GiST (public_location)
      WHERE verification_status <> 'REJECTED'
    `);
    await queryRunner.query(`
      CREATE INDEX idx_flood_reports_observed_status
      ON flood_reports (observed_at DESC, id) WHERE verification_status <> 'REJECTED'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE flood_reports");
  }
}
