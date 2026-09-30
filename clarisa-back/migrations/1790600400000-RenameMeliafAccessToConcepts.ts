import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The access rows of the module follow its new name, "Concepts" (Yeck,
 * 2026-09-30; the routes moved in `RenameMeliafTaxonomyRoutesToConcepts1790500400000`).
 *
 * - Permission routes still named `api/meliaf-taxonomy…` move to
 *   `api/concepts…`. On a fresh database `AddMeliafConceptsEditorRole1790600100000`
 *   runs after the route rename and seeds the old route, so it is caught here.
 * - Module, labels and descriptions shown on the Roles screen drop
 *   "MELIAF Taxonomy". A label or description edited by hand is kept: only a
 *   NULL value or the exact text an earlier migration wrote is replaced.
 * - Role `MELIAF_CE` "MELIAF Concepts Editor" becomes `CONCEPTS_CE`
 *   "Concepts Editor". Same id, so every grant and membership stays.
 *
 * Idempotent (a second run finds no old value) and `down()` restores the old
 * strings. `updated_at = updated_at`: a technical rename, nobody edited them.
 */
export class RenameMeliafAccessToConcepts1790600400000
  implements MigrationInterface
{
  name = 'RenameMeliafAccessToConcepts1790600400000';

  static readonly FULL_ROUTE = '/api/concepts/admin';
  static readonly CONCEPTS_ROUTE = '/api/concepts/admin/meliaf/concepts';

  /** [route, column, old values (any of), new value] */
  private static readonly TEXTS: ReadonlyArray<
    [route: string, column: 'label' | 'description', from: string[], to: string]
  > = [
    [
      '/api/concepts/admin',
      'label',
      ['Manage the MELIAF Taxonomy', 'MELIAF Taxonomy — Full administration'],
      'Concepts — Full administration',
    ],
    [
      '/api/concepts/admin',
      'description',
      ['Create, edit, import and publish the MELIAF Taxonomy concepts.'],
      'Create, edit, import and publish concepts.',
    ],
    [
      '/api/concepts/admin/meliaf/concepts',
      'description',
      [
        'Create and edit MELIAF concepts: labels, relations, mappings, icons, approve or deprecate and merge. Does not include lists, custom fields, collections, import, requests, releases or usage.',
      ],
      'Create and edit concepts: labels, relations, mappings, icons, approve or deprecate and merge. Does not include lists, custom fields, collections, import, requests, releases or usage.',
    ],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = RenameMeliafAccessToConcepts1790600400000;
    await this.renameRoutes(queryRunner, 'api/meliaf-taxonomy', 'api/concepts');
    await this.renameModule(queryRunner, 'MELIAF Taxonomy', 'Concepts');
    // On a fresh database the metadata of AddRolesUsersAdmin1790600000000
    // looked for the old route and matched nothing: the module is still NULL.
    await queryRunner.query(
      `UPDATE permissions SET module = 'Concepts', updated_at = updated_at
        WHERE name LIKE '/api/concepts/admin%' AND module IS NULL`,
    );
    for (const [route, column, from, to] of cls.TEXTS) {
      await queryRunner.query(
        `UPDATE permissions SET \`${column}\` = ?, updated_at = updated_at
          WHERE name = ? AND (\`${column}\` IS NULL OR \`${column}\` IN (?))`,
        [to, route, from],
      );
    }
    await this.renameRole(
      queryRunner,
      ['MELIAF_CE', 'MELIAF Concepts Editor'],
      ['CONCEPTS_CE', 'Concepts Editor'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cls = RenameMeliafAccessToConcepts1790600400000;
    await this.renameRole(
      queryRunner,
      ['CONCEPTS_CE', 'Concepts Editor'],
      ['MELIAF_CE', 'MELIAF Concepts Editor'],
    );
    for (const [route, column, from, to] of cls.TEXTS) {
      await queryRunner.query(
        `UPDATE permissions SET \`${column}\` = ?, updated_at = updated_at
          WHERE name = ? AND \`${column}\` = ?`,
        [from[from.length - 1], route, to],
      );
    }
    await this.renameModule(queryRunner, 'Concepts', 'MELIAF Taxonomy');
    // The earlier migrations' down() look for the old routes, so they go back
    // here; RenameMeliafTaxonomyRoutesToConcepts1790500400000's down() then
    // finds nothing left to move (idempotent).
    await this.renameRoutes(queryRunner, 'api/concepts', 'api/meliaf-taxonomy');
  }

  private async renameRoutes(
    queryRunner: QueryRunner,
    from: string,
    to: string,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE permissions
          SET name = REPLACE(name, ?, ?), updated_at = updated_at
        WHERE name LIKE CONCAT('%', ?, '%')`,
      [from, to, from],
    );
  }

  private async renameModule(
    queryRunner: QueryRunner,
    from: string,
    to: string,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE permissions SET module = ?, updated_at = updated_at
        WHERE module = ?`,
      [to, from],
    );
  }

  /** Acronym always; description only while it is still the seeded one. */
  private async renameRole(
    queryRunner: QueryRunner,
    [fromAcronym, fromDescription]: [string, string],
    [toAcronym, toDescription]: [string, string],
  ): Promise<void> {
    // Checked first, not in a subquery: MySQL refuses `roles` as both the
    // UPDATE target and a subquery source (error 1093).
    const taken = await queryRunner.query(
      `SELECT 1 FROM roles WHERE acronym = ? LIMIT 1`,
      [toAcronym],
    );
    if (taken?.length) return;
    await queryRunner.query(
      `UPDATE roles
          SET description = IF(description = ?, ?, description),
              acronym = ?,
              updated_at = updated_at
        WHERE acronym = ?`,
      [fromDescription, toDescription, toAcronym, fromAcronym],
    );
  }
}
