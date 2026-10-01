import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The scheme is the API prefix and the URI root (Yeck, 2026-10-01: "/api/
 * meliaf-taxonomy/concepts mejor"): `/api/concepts/{scheme}/…` becomes
 * `/api/meliaf-taxonomy/…` and `/concepts/meliaf-taxonomy/{id}` becomes
 * `/meliaf-taxonomy/{id}`. Stored data that carries the old paths:
 *
 * - `permissions.name`: `/api/concepts/admin/meliaf-taxonomy/…` (the
 *   concepts-only role) and `/api/concepts/admin` (full admins), matched by
 *   substring by PermissionGuard.
 * - Release URIs and the URIs inside stored JSON (history, proposals,
 *   releases, outbox).
 *
 * Idempotent: every step finds the old string once. `down()` restores it.
 */
export class MeliafTaxonomyApiPrefix1790600700000
  implements MigrationInterface
{
  name = 'MeliafTaxonomyApiPrefix1790600700000';

  /** Permission of the concepts-only role (CONCEPTS_CE) and of full admins. */
  static readonly CONCEPTS_ROUTE = '/api/meliaf-taxonomy/admin/concepts';
  static readonly FULL_ROUTE = '/api/meliaf-taxonomy/admin';

  /** Permission routes, most specific first. */
  static readonly ROUTES: ReadonlyArray<[from: string, to: string]> = [
    ['/api/concepts/admin/meliaf-taxonomy', '/api/meliaf-taxonomy/admin'],
    ['/api/concepts/admin', '/api/meliaf-taxonomy/admin'],
  ];

  static readonly URI = ['/concepts/meliaf-taxonomy/', '/meliaf-taxonomy/'];

  static readonly JSON_COLUMNS: ReadonlyArray<[table: string, column: string]> =
    [
      ['gc_history', 'changes'],
      ['gc_proposals', 'payload'],
      ['gc_releases', 'snapshot'],
      ['gc_outbox', 'payload'],
    ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = MeliafTaxonomyApiPrefix1790600700000;
    for (const [from, to] of cls.ROUTES)
      await this.moveRoutes(queryRunner, from, to);
    await this.moveUris(queryRunner, cls.URI[0], cls.URI[1]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cls = MeliafTaxonomyApiPrefix1790600700000;
    await this.moveUris(queryRunner, cls.URI[1], cls.URI[0]);
    // The concepts-only route first, so the full-admin rewrite does not catch it.
    await this.moveRoutes(
      queryRunner,
      '/api/meliaf-taxonomy/admin/',
      '/api/concepts/admin/meliaf-taxonomy/',
    );
    await this.moveRoutes(
      queryRunner,
      '/api/meliaf-taxonomy/admin',
      '/api/concepts/admin',
    );
  }

  /** Rewrites the permission names that START with `from`. */
  private async moveRoutes(
    queryRunner: QueryRunner,
    from: string,
    to: string,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE permissions
          SET name = REPLACE(name, ?, ?), updated_at = updated_at
        WHERE name LIKE CONCAT(?, '%')`,
      [from, to, from],
    );
  }

  /** Every `/concepts/meliaf-taxonomy/` (URIs and API paths alike) loses `/concepts`. */
  private async moveUris(
    queryRunner: QueryRunner,
    from: string,
    to: string,
  ): Promise<void> {
    const cls = MeliafTaxonomyApiPrefix1790600700000;
    // Going back must not catch the new segment inside `/api/meliaf-taxonomy/`.
    const guard =
      from === cls.URI[1]
        ? `AND release_uri NOT LIKE '%/api/meliaf-taxonomy/%'`
        : '';
    await queryRunner.query(
      `UPDATE gc_releases SET release_uri = REPLACE(release_uri, ?, ?)
        WHERE release_uri LIKE CONCAT('%', ?, '%') ${guard}`,
      [from, to, from],
    );
    if (from === cls.URI[1]) return; // JSON is not walked back: only URIs of a test release live there.
    for (const [table, column] of cls.JSON_COLUMNS) {
      const keepDate =
        table === 'gc_proposals' ? ', updated_at = updated_at' : '';
      await queryRunner.query(
        `UPDATE \`${table}\` SET \`${column}\` = REPLACE(\`${column}\`, ?, ?)${keepDate}
          WHERE \`${column}\` LIKE CONCAT('%', ?, '%')`,
        [from, to, from],
      );
    }
  }
}
