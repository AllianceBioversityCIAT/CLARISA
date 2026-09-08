import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repair migration for the dev environment DB drift: the old `dev`-branch
 * migration `ChangingColumnNameGlossary1721250533225` renamed
 * `glossary.title` to `term` in the dev database, but the active code line
 * (dev-v2/staging/main) maps the column as `title` (exposed as "term" only
 * in the API response), which broke every glossary endpoint in dev.
 *
 * Conditional on purpose: it renames `term` back to `title` ONLY where the
 * drift exists (dev). On healthy databases (staging/prod, where the column
 * is already `title`) it is a no-op, so promoting this migration is safe
 * everywhere.
 */
export class RestoreGlossaryTitleColumn1784057149464
  implements MigrationInterface
{
  name = 'RestoreGlossaryTitleColumn1784057149464';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ drifted }] = await queryRunner.query(
      `SELECT COUNT(*) AS drifted FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'glossary'
         AND COLUMN_NAME = 'term'`,
    );

    if (Number(drifted) === 1) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` CHANGE \`term\` \`title\` text CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NOT NULL`,
      );
    }
  }

  public async down(): Promise<void> {
    // Intentional no-op: the `term` column name must never be reintroduced
    // (schema/API names follow prod — no renames).
  }
}
