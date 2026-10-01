import { MigrationInterface, QueryRunner } from 'typeorm';
import { DropMeliafFromConcepts1790600500000 } from './1790600500000-DropMeliafFromConcepts';

/**
 * The default scheme's code is `meliaf-taxonomy` and its title
 * "MELIAF taxonomy" (Yeck and Héctor, 2026-10-01). It follows
 * `DropMeliafFromConcepts1790600500000`, which had named it `concepts` and
 * dropped the scheme segment from its URIs. This puts the segment back with
 * the new code:
 *
 * - `gc_schemes`: code `concepts` → `meliaf-taxonomy`, title `Concepts` →
 *   `MELIAF taxonomy`; the scheme scope of its own list values follows.
 * - Permission routes `…/admin/concepts/…` → `…/admin/meliaf-taxonomy/…`
 *   (the concepts-only role keeps opening the same screens).
 * - Release URIs and the URIs and scheme code inside stored JSON (history,
 *   proposals, releases, outbox): `…cgiar.org/concepts/{id}` →
 *   `…cgiar.org/concepts/meliaf-taxonomy/{id}`.
 *
 * The field names (`functions`, `phase_primary`, `phase_also`) stay.
 * Idempotent: each step only finds the old value once. `down()` goes back to
 * `concepts`.
 */
export class ConceptsSchemeCodeMeliafTaxonomy1790600600000
  implements MigrationInterface
{
  name = 'ConceptsSchemeCodeMeliafTaxonomy1790600600000';

  static readonly CODE = 'meliaf-taxonomy';
  static readonly TITLE = 'MELIAF taxonomy';
  /** Permission of the concepts-only role (CONCEPTS_CE) and of full admins. */
  static readonly CONCEPTS_ROUTE =
    '/api/concepts/admin/meliaf-taxonomy/concepts';
  static readonly FULL_ROUTE = '/api/concepts/admin';

  static readonly JSON_COLUMNS: ReadonlyArray<[table: string, column: string]> =
    [
      ['gc_history', 'changes'],
      ['gc_proposals', 'payload'],
      ['gc_releases', 'snapshot'],
      ['gc_outbox', 'payload'],
    ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = ConceptsSchemeCodeMeliafTaxonomy1790600600000;
    await DropMeliafFromConcepts1790600500000.renameScheme(
      queryRunner,
      'concepts',
      cls.CODE,
    );
    await queryRunner.query(
      `UPDATE gc_schemes SET title = ?, updated_at = updated_at
        WHERE code = ? AND title = 'Concepts'`,
      [cls.TITLE, cls.CODE],
    );
    await DropMeliafFromConcepts1790600500000.renameRoutes(
      queryRunner,
      '/admin/concepts/',
      `/admin/${cls.CODE}/`,
    );
    await DropMeliafFromConcepts1790600500000.renameRoutes(
      queryRunner,
      '/admin/concepts',
      `/admin/${cls.CODE}`,
    );

    // A URI is a host followed by /concepts/{id} or /concepts/releases/…; the
    // API (/api/concepts/…) never matches because a scheme code follows it.
    const uri = `(cgiar\\.org|localhost(:[0-9]+)?)/concepts/([0-9]+|releases/)`;
    await queryRunner.query(
      `UPDATE gc_releases
          SET release_uri = REGEXP_REPLACE(release_uri, ?, ?)
        WHERE release_uri REGEXP ?`,
      [uri, `$1/concepts/${cls.CODE}/$3`, uri],
    );
    for (const [table, column] of cls.JSON_COLUMNS) {
      const keepDate =
        table === 'gc_proposals' ? ', updated_at = updated_at' : '';
      await queryRunner.query(
        `UPDATE \`${table}\`
            SET \`${column}\` = REGEXP_REPLACE(\`${column}\`, ?, ?)${keepDate}
          WHERE \`${column}\` REGEXP ?`,
        [uri, `$1/concepts/${cls.CODE}/$3`, uri],
      );
      await queryRunner.query(
        `UPDATE \`${table}\`
            SET \`${column}\` = REPLACE(\`${column}\`, '"scheme":"concepts"', ?)${keepDate}
          WHERE \`${column}\` LIKE '%"scheme":"concepts"%'`,
        [`"scheme":"${cls.CODE}"`],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cls = ConceptsSchemeCodeMeliafTaxonomy1790600600000;
    await DropMeliafFromConcepts1790600500000.renameRoutes(
      queryRunner,
      `/admin/${cls.CODE}`,
      '/admin/concepts',
    );
    await queryRunner.query(
      `UPDATE gc_schemes SET title = 'Concepts', updated_at = updated_at
        WHERE code = ? AND title = ?`,
      [cls.CODE, cls.TITLE],
    );
    await DropMeliafFromConcepts1790600500000.renameScheme(
      queryRunner,
      cls.CODE,
      'concepts',
    );
    const back = `/concepts/${cls.CODE}/`;
    await queryRunner.query(
      `UPDATE gc_releases SET release_uri = REPLACE(release_uri, ?, '/concepts/')
        WHERE release_uri LIKE CONCAT('%', ?, '%')`,
      [back, back],
    );
    for (const [table, column] of cls.JSON_COLUMNS)
      await queryRunner.query(
        `UPDATE \`${table}\`
            SET \`${column}\` = REPLACE(REPLACE(\`${column}\`, ?, '/concepts/'), ?, '"scheme":"concepts"')
          WHERE \`${column}\` LIKE CONCAT('%', ?, '%')
             OR \`${column}\` LIKE CONCAT('%', ?, '%')`,
        [back, `"scheme":"${cls.CODE}"`, back, `"scheme":"${cls.CODE}"`],
      );
  }
}
