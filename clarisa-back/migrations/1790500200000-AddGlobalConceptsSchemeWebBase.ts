import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-scheme base of the human pages (the landing site), next to `uri_base`.
 * Lets each environment send browsers and e-mail links to its own front from
 * data, without an environment variable. Additive and idempotent: MySQL DDL
 * commits on its own, so the column is only added when it is missing.
 */
export class AddGlobalConceptsSchemeWebBase1790500200000
  implements MigrationInterface
{
  name = 'AddGlobalConceptsSchemeWebBase1790500200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ n }] = await queryRunner.query(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gc_schemes' AND COLUMN_NAME = 'web_base'`,
    );
    if (Number(n) === 0) {
      await queryRunner.query(
        'ALTER TABLE `gc_schemes` ADD `web_base` varchar(255) NULL AFTER `uri_base`',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ n }] = await queryRunner.query(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gc_schemes' AND COLUMN_NAME = 'web_base'`,
    );
    if (Number(n) > 0) {
      await queryRunner.query(
        'ALTER TABLE `gc_schemes` DROP COLUMN `web_base`',
      );
    }
  }
}
