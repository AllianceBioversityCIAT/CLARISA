import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Safety copy of the glossary tables before the taxonomy work touches them
 * (Yeck, 2026-10-30: "toca hacer una copia de esa tabla de prod por si las
 * moscas"). `glossary_bak_20261030` and `glossary_portfolios_bak_20261030`
 * are exact copies (`CREATE TABLE … LIKE` keeps columns, keys and ids), taken
 * where the data lives, by the pipeline that deploys the change, so no one
 * needs database access to get them.
 *
 * Idempotent: the table is created only if missing and filled only while
 * empty, so a re-run never overwrites the copy with newer rows. `down()` is
 * intentionally empty: a backup is never dropped by a rollback; it goes away
 * by hand once the taxonomy is the only source.
 */
export class BackupGlossaryBeforeTaxonomyCopy1793404700000
  implements MigrationInterface
{
  name = 'BackupGlossaryBeforeTaxonomyCopy1793404700000';

  static readonly SUFFIX = '_bak_20261030';
  static readonly TABLES = ['glossary', 'glossary_portfolios'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = BackupGlossaryBeforeTaxonomyCopy1793404700000;
    for (const table of cls.TABLES) {
      const backup = `${table}${cls.SUFFIX}`;
      await queryRunner.query(
        `CREATE TABLE IF NOT EXISTS \`${backup}\` LIKE \`${table}\``,
      );
      const rows: { n: number | string }[] = await queryRunner.query(
        `SELECT COUNT(*) AS n FROM \`${backup}\``,
      );
      if (Number(rows?.[0]?.n ?? 0) === 0) {
        await queryRunner.query(
          `INSERT INTO \`${backup}\` SELECT * FROM \`${table}\``,
        );
      }
    }
  }

  public async down(): Promise<void> {
    // Intentionally empty, see the class comment.
  }
}
