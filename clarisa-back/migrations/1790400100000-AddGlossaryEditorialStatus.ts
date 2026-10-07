import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives every glossary term an editorial status (draft, in review, approved,
 * deprecated) and a pointer to the term that replaces it once deprecated.
 *
 * Asked by the MELIAF taxonomy work for the Rabat convening (capability
 * checklist row "term status, version history and change log"; build brief:
 * "retired terms are deprecated, not deleted").
 *
 * Additive and behaviour-preserving: every existing row becomes `approved`, the
 * status the public endpoints serve, so `GET api/glossary` returns exactly the
 * same terms as before and only appends two keys (`editorialStatus`,
 * `replacedByTermId`).
 *
 * Idempotent: each DDL statement commits on its own in MySQL, so both columns
 * are guarded on INFORMATION_SCHEMA and a partial run can be repeated.
 */
export class AddGlossaryEditorialStatus1790400100000
  implements MigrationInterface
{
  name = 'AddGlossaryEditorialStatus1790400100000';

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
    if (!(await this.columnExists(queryRunner, 'editorial_status'))) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` ADD COLUMN \`editorial_status\` varchar(20) NOT NULL DEFAULT 'approved'`,
      );
    }
    if (!(await this.columnExists(queryRunner, 'replaced_by_id'))) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` ADD COLUMN \`replaced_by_id\` bigint NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner, 'replaced_by_id')) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` DROP COLUMN \`replaced_by_id\``,
      );
    }
    if (await this.columnExists(queryRunner, 'editorial_status')) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` DROP COLUMN \`editorial_status\``,
      );
    }
  }
}
