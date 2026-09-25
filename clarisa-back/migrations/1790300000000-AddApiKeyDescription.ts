import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a free-text `description` to every API key.
 *
 * Requested by Héctor Tobón (2026-09-24) while reviewing the Microservices
 * panel: a key called "Reporting Tool" says nothing about which integration
 * holds it, who asked for it or what it is used for, and the operator has to
 * guess from the prefix. The description carries that context next to the key.
 *
 * Nullable and additive: `GET /api/api-keys` keeps every field it publishes
 * today and appends `description`. Nothing reads the column as required.
 *
 * Idempotent on purpose: in MySQL each DDL statement commits on its own, so a
 * migration that fails halfway cannot be rolled back by the surrounding
 * transaction. Guarding on INFORMATION_SCHEMA lets a partially applied run be
 * repeated safely.
 */
export class AddApiKeyDescription1790300000000 implements MigrationInterface {
  name = 'AddApiKeyDescription1790300000000';

  private async columnExists(queryRunner: QueryRunner): Promise<boolean> {
    const [{ found }] = await queryRunner.query(
      `SELECT COUNT(*) AS found FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'api_keys'
         AND COLUMN_NAME = 'description'`,
    );
    return Number(found) > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.columnExists(queryRunner))) {
      await queryRunner.query(
        `ALTER TABLE \`api_keys\` ADD COLUMN \`description\` text NULL AFTER \`name\``,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner)) {
      await queryRunner.query(
        `ALTER TABLE \`api_keys\` DROP COLUMN \`description\``,
      );
    }
  }
}
