import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The module's HTTP prefix moves from `api/meliaf-taxonomy` to `api/concepts`
 * and its public pages from `landing-page/global-concepts` to
 * `landing-page/concepts` (Yeck, 2026-09-30: the product is shown as
 * "Concepts", a generic CLARISA service; MELIAF is one scheme inside it).
 * Three kinds of stored data carry the old names:
 *
 * - `permissions.name`: `PermissionGuard` authorises by substring on the
 *   request path, so `/api/meliaf-taxonomy/admin…` would stop matching.
 * - `api_keys.scopes` (JSON array): `meliaf-taxonomy:*` becomes `concepts:*`,
 *   or keys already issued would be refused.
 * - `gc_schemes.web_base`: the per-scheme base of the human pages, used for
 *   browser redirects and e-mail links.
 *
 * Only the stored strings change; ids, grants and every other value stay.
 * Idempotent: a second run finds no old value. `down()` restores the old
 * strings. `updated_at = updated_at` keeps the rows' last-edit date: this is
 * a technical rename, nobody edited them.
 */
export class RenameMeliafTaxonomyRoutesToConcepts1790500400000
  implements MigrationInterface
{
  name = 'RenameMeliafTaxonomyRoutesToConcepts1790500400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.rename(queryRunner, 'meliaf-taxonomy', 'concepts');
    await this.renameWebBase(queryRunner, 'global-concepts', 'concepts');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.rename(queryRunner, 'concepts', 'meliaf-taxonomy');
    await this.renameWebBase(queryRunner, 'concepts', 'global-concepts');
  }

  private async rename(
    queryRunner: QueryRunner,
    from: string,
    to: string,
  ): Promise<void> {
    const fromRoute = `api/${from}`;
    const toRoute = `api/${to}`;
    await queryRunner.query(
      `UPDATE permissions
          SET name = REPLACE(name, ?, ?), updated_at = updated_at
        WHERE name LIKE CONCAT('%', ?, '%')`,
      [fromRoute, toRoute, fromRoute],
    );

    // Scope values are JSON strings: match the opening quote so only a value
    // that STARTS with the prefix is rewritten.
    const fromScope = `"${from}:`;
    const toScope = `"${to}:`;
    await queryRunner.query(
      `UPDATE api_keys
          SET scopes = CAST(REPLACE(CAST(scopes AS CHAR), ?, ?) AS JSON),
              updated_at = updated_at
        WHERE scopes IS NOT NULL
          AND CAST(scopes AS CHAR) LIKE CONCAT('%', ?, '%')`,
      [fromScope, toScope, fromScope],
    );
  }

  /** Only a base that ENDS with the old segment is rewritten. */
  private async renameWebBase(
    queryRunner: QueryRunner,
    from: string,
    to: string,
  ): Promise<void> {
    const fromTail = `/landing-page/${from}`;
    const toTail = `/landing-page/${to}`;
    await queryRunner.query(
      `UPDATE gc_schemes
          SET web_base = CONCAT(LEFT(TRIM(TRAILING '/' FROM web_base),
                                     CHAR_LENGTH(TRIM(TRAILING '/' FROM web_base)) - CHAR_LENGTH(?)), ?),
              updated_at = updated_at
        WHERE web_base IS NOT NULL
          AND TRIM(TRAILING '/' FROM web_base) LIKE CONCAT('%', ?)`,
      [fromTail, toTail, fromTail],
    );
  }
}
