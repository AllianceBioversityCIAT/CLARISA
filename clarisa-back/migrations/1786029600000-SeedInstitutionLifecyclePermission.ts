import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registers the permission for `PATCH /api/institutions/lifecycle/:id` and
 * grants it to whoever can already create institutions in bulk.
 *
 * Without this row the endpoint answers 403 to every user, including admins:
 * `PermissionGuard` authorises by checking whether the requested path contains
 * one of the user's permissions, and a route nobody has is a route nobody can
 * call.
 *
 * The role is not hard-coded. `/api/institutions/create-bulk` is the closest
 * existing capability — whoever may create institutions in bulk is exactly who
 * should be able to retire one — so the grant is copied from it. That keeps the
 * migration correct on every environment regardless of how roles are numbered
 * there, and it means the decision is inherited rather than invented.
 *
 * Idempotent: run twice and nothing is duplicated. This migration is only ever
 * executed by the deploy pipeline.
 */
export class SeedInstitutionLifecyclePermission1786029600000
  implements MigrationInterface
{
  name = 'SeedInstitutionLifecyclePermission1786029600000';

  /** Matched as a substring of the request path, hence no trailing id. */
  private static readonly ROUTE = '/api/institutions/lifecycle';

  /** The capability the grant is copied from. */
  private static readonly TEMPLATE_ROUTE = '/api/institutions/create-bulk';

  /** Same technical user every seeded row in this table was created by. */
  private static readonly SEED_USER = 3043;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const route = SeedInstitutionLifecyclePermission1786029600000.ROUTE;
    const template =
      SeedInstitutionLifecyclePermission1786029600000.TEMPLATE_ROUTE;
    const seedUser = SeedInstitutionLifecyclePermission1786029600000.SEED_USER;

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

    // Copy the grant from the template capability, skipping any role that
    // already has it. If the template is missing on this environment the
    // statement inserts nothing and the deploy still succeeds: the permission
    // exists and can be granted by hand, which is preferable to guessing a
    // role id and handing the whole catalogue to the wrong people.
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    const route = SeedInstitutionLifecyclePermission1786029600000.ROUTE;

    // Reverse order: the grants reference the permission.
    await queryRunner.query(
      `DELETE rp FROM role_permission rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE p.name = ?`,
      [route],
    );

    await queryRunner.query(`DELETE FROM permissions WHERE name = ?`, [route]);
  }
}
