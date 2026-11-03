import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `allowed_endpoints` to every API key: the routes of the calling
 * microservice the key may use.
 *
 * Reporting (PRMS) asks CLARISA "may this key call /api/qa/results/intake?"
 * by sending `endpoint_accessed`, but CLARISA only logged it, so any active
 * key was valid for any route, even an invented one (`/zzz/nada`, found by
 * Reporting on 2026-11-03 with the QA key). With a list, `validate` rejects
 * every route not in it.
 *
 * Nullable and additive: NULL means no restriction, like `allowed_ips`, so
 * the keys in use today (bilateral, QA, …) keep working until their list is
 * set. Idempotent: MySQL DDL commits on its own, so the column is checked in
 * INFORMATION_SCHEMA before the ALTER.
 */
export class AddApiKeyAllowedEndpoints1792800000000
  implements MigrationInterface
{
  name = 'AddApiKeyAllowedEndpoints1792800000000';

  private async columnExists(queryRunner: QueryRunner): Promise<boolean> {
    const [{ found }] = await queryRunner.query(
      `SELECT COUNT(*) AS found FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'api_keys'
         AND COLUMN_NAME = 'allowed_endpoints'`,
    );
    return Number(found) > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.columnExists(queryRunner))) {
      await queryRunner.query(
        `ALTER TABLE \`api_keys\` ADD COLUMN \`allowed_endpoints\` json NULL AFTER \`allowed_ips\``,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner)) {
      await queryRunner.query(
        `ALTER TABLE \`api_keys\` DROP COLUMN \`allowed_endpoints\``,
      );
    }
  }
}
