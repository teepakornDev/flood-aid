import type { MigrationInterface, QueryRunner } from "typeorm";

export class EnableDatabaseExtensions1764000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE EXTENSION IF NOT EXISTS postgis");
    await queryRunner.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  }

  async down(): Promise<void> {
    // Preserve extensions because the database image may already provide them.
  }
}
