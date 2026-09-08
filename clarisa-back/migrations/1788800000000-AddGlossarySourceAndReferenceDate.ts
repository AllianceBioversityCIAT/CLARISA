import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds provenance to every glossary term: where the definition comes from and
 * the date of the referenced material.
 *
 * Requested in the Operation Meeting of 2026-09-07 (Nicoleta, via Ángel
 * Jarrín): the published definitions carry no attribution, so a reader cannot
 * tell whether a term reflects the current framework or a document from three
 * portfolios ago.
 *
 * Both columns are nullable and additive. `GET api/glossary` keeps every key
 * it already publishes; the two new ones are appended, so PRMS and any other
 * consumer that reads the endpoint today is unaffected.
 *
 * Idempotent on purpose: in MySQL each DDL statement commits on its own, so a
 * migration that fails halfway cannot be rolled back by the surrounding
 * transaction. Guarding on INFORMATION_SCHEMA lets a partially applied run be
 * repeated safely.
 */
export class AddGlossarySourceAndReferenceDate1788800000000
  implements MigrationInterface
{
  name = 'AddGlossarySourceAndReferenceDate1788800000000';

  private async columnExists(
    queryRunner: QueryRunner,
    column: string,
  ): Promise<boolean> {
    const [{ found }] = await queryRunner.query(
      `SELECT COUNT(*) AS found FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'glossary'
         AND COLUMN_NAME = ?`,
      [column],
    );
    return Number(found) > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.columnExists(queryRunner, 'source'))) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` ADD COLUMN \`source\` varchar(500) NULL AFTER \`definition\``,
      );
    }

    if (!(await this.columnExists(queryRunner, 'source_url'))) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` ADD COLUMN \`source_url\` varchar(500) NULL AFTER \`source\``,
      );
    }

    if (!(await this.columnExists(queryRunner, 'reference_date'))) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` ADD COLUMN \`reference_date\` date NULL AFTER \`source_url\``,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner, 'reference_date')) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` DROP COLUMN \`reference_date\``,
      );
    }
    if (await this.columnExists(queryRunner, 'source_url')) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` DROP COLUMN \`source_url\``,
      );
    }
    if (await this.columnExists(queryRunner, 'source')) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` DROP COLUMN \`source\``,
      );
    }
  }
}
