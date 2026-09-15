import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Relates the rows that are versions of the same concept.
 *
 * A term can mean different things in different portfolios, and the glossary
 * already holds those as separate rows — `Impact` lives as a 2022-era row plus
 * a current one. Nothing tied them together, so the panel listed them apart and
 * the public page drew two unrelated cards.
 *
 * Grouping by title does not hold: the two pairs that need it right now differ
 * by a non-breaking space in the title, and a term can be renamed in one
 * portfolio and not in the other. The relation is therefore declared from the
 * panel and stored here.
 *
 * `NULL` means the row is its own group, so **every existing row keeps working
 * untouched** and no backfill is needed: the effective group of a row is
 * `COALESCE(group_id, id)`.
 *
 * Idempotent on purpose: in MySQL each DDL statement commits on its own, so a
 * migration that fails halfway cannot be rolled back by the surrounding
 * transaction. Guarding on INFORMATION_SCHEMA lets a partially applied run be
 * repeated safely.
 */
export class AddGlossaryGroup1789480000000 implements MigrationInterface {
  name = 'AddGlossaryGroup1789480000000';

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

  private async indexExists(
    queryRunner: QueryRunner,
    index: string,
  ): Promise<boolean> {
    const [{ found }] = await queryRunner.query(
      `SELECT COUNT(*) AS found FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'glossary'
         AND INDEX_NAME = ?`,
      [index],
    );
    return Number(found) > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.columnExists(queryRunner, 'group_id'))) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` ADD COLUMN \`group_id\` bigint NULL AFTER \`id\``,
      );
    }

    // No foreign key on purpose: it points at the same table and the column is
    // nullable by design, so an orphan simply means "its own group" — the same
    // state every row starts in. A constraint would only add a failure mode to
    // the deactivation of a row that other versions point at.
    if (!(await this.indexExists(queryRunner, 'IDX_glossary_group_id'))) {
      await queryRunner.query(
        `CREATE INDEX \`IDX_glossary_group_id\` ON \`glossary\` (\`group_id\`)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.indexExists(queryRunner, 'IDX_glossary_group_id')) {
      await queryRunner.query(
        `DROP INDEX \`IDX_glossary_group_id\` ON \`glossary\``,
      );
    }
    if (await this.columnExists(queryRunner, 'group_id')) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` DROP COLUMN \`group_id\``,
      );
    }
  }
}
