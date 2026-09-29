import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The module's HTTP prefix moves from `api/global-concepts` to
 * `api/meliaf-taxonomy` (Héctor, 2026-09-29: "renombren el end-point para
 * MELIAF Taxonomy"). Two kinds of stored data carry the old name:
 *
 * - `permissions.name`: `PermissionGuard` authorises by substring on the
 *   request path, so the admin grant seeded by
 *   `SeedGlobalConceptsAdminPermission1790500100000`
 *   (`/api/global-concepts/admin`) would stop matching the new path.
 * - `api_keys.scopes` (JSON array): the `global-concepts:*` scopes become
 *   `meliaf-taxonomy:*`, or keys already issued would be refused.
 *
 * Only the stored strings change; ids, grants (`role_permission`) and every
 * other scope stay as they are. Idempotent: a second run finds no old value.
 * `down()` restores the old strings. `updated_at = updated_at` keeps the
 * rows' last-edit date: this is a technical rename, nobody edited them.
 */
export class RenameGlobalConceptsRoutesToMeliafTaxonomy1790500300000
  implements MigrationInterface
{
  name = 'RenameGlobalConceptsRoutesToMeliafTaxonomy1790500300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.rename(queryRunner, 'global-concepts', 'meliaf-taxonomy');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.rename(queryRunner, 'meliaf-taxonomy', 'global-concepts');
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
}
