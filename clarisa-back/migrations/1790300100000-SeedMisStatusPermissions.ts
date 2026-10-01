import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registers the permissions for deactivating and reactivating a MIS
 * (`PATCH /api/mises/deactivate/:id` and `PATCH /api/mises/activate/:id`) and
 * grants them to whoever can already create a MIS.
 *
 * Why it exists: the MIS registry had no way to retire an entry. Yeck asked
 * (2026-09-24) for a logical delete — the row stays, `is_active` flips — so
 * that API keys, partner requests and users that reference the MIS keep their
 * history. The new routes sit behind `PermissionGuard`, which authorises by
 * checking whether the requested path contains one of the caller's
 * permissions, so without these rows the routes would answer 403 to
 * everyone, admins included.
 *
 * The role is not hard-coded: `/api/mises/create` is the capability the grant
 * is copied from. Whoever may register a MIS is the same catalogue
 * administrator who may retire one. If on some environment the create grant is
 * spelled as a shorter prefix (`/api/mises`), that prefix already matches the
 * new paths by substring and the copy is simply a no-op.
 *
 * ⚠️ If the template capability does not exist on an environment, nothing is
 * granted and the deploy still succeeds: the permission rows exist and can be
 * assigned by hand. After deploying, confirm the intended administrators can
 * deactivate a MIS from `/clarisa-panel/manage/microservices-admin`.
 *
 * Idempotent: run twice and nothing is duplicated.
 */
export class SeedMisStatusPermissions1790300100000
  implements MigrationInterface
{
  name = 'SeedMisStatusPermissions1790300100000';

  /** Matched as a substring of the request path, hence no trailing id. */
  private static readonly ROUTES = [
    '/api/mises/deactivate',
    '/api/mises/activate',
  ];

  /** The capability the grants are copied from. */
  private static readonly TEMPLATE_ROUTE = '/api/mises/create';

  /** Same technical user every seeded row in this table was created by. */
  private static readonly SEED_USER = 3043;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const template = SeedMisStatusPermissions1790300100000.TEMPLATE_ROUTE;
    const seedUser = SeedMisStatusPermissions1790300100000.SEED_USER;

    for (const route of SeedMisStatusPermissions1790300100000.ROUTES) {
      // `name` is TEXT, so it cannot carry a unique index and `INSERT IGNORE`
      // would not help: the guard has to be an explicit lookup.
      await queryRunner.query(
        `INSERT INTO permissions (name, is_active, created_by)
         SELECT ?, 1, ?
         FROM DUAL
         WHERE NOT EXISTS (
           SELECT 1 FROM permissions WHERE name = ?
         )`,
        [route, seedUser, route],
      );

      await queryRunner.query(
        `INSERT INTO role_permission (role_id, permission_id, is_active, created_by)
         SELECT rp.role_id, target.id, 1, ?
         FROM role_permission rp
         JOIN permissions source ON source.id = rp.permission_id AND source.name = ?
         JOIN permissions target ON target.name = ?
         WHERE rp.is_active = 1
           AND NOT EXISTS (
             SELECT 1 FROM role_permission existing
             WHERE existing.role_id = rp.role_id
               AND existing.permission_id = target.id
           )`,
        [seedUser, template, route],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ⚠️ This also removes grants added by hand after the deploy. Reverting is
    // not a way back to the previous state of this table.
    for (const route of SeedMisStatusPermissions1790300100000.ROUTES) {
      await queryRunner.query(
        `DELETE rp FROM role_permission rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE p.name = ?`,
        [route],
      );
      await queryRunner.query(`DELETE FROM permissions WHERE name = ?`, [
        route,
      ]);
    }
  }
}
