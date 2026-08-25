import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registers the permission for the glossary admin surface (`api/glossary/admin`)
 * and grants it to whoever can already create institutions in bulk.
 *
 * Why it exists: `GlossaryAdminController` used to be protected by
 * `JwtAuthGuard` alone, which only proves *who* is calling. Any authenticated
 * CLARISA user could therefore create, edit and deactivate glossary terms, and
 * run bulk imports that land on the public glossary page. Adding
 * `PermissionGuard` closes that, but the guard authorises by checking whether
 * the requested path contains one of the user's permissions — so without this
 * row the module would answer 403 to everyone, admins included.
 *
 * The role is not hard-coded. `/api/institutions/create-bulk` is the closest
 * existing capability: whoever may load institutions in bulk is the same
 * catalogue administrator who curates the glossary. Copying the grant keeps
 * this correct on every environment regardless of how roles are numbered
 * there, and makes the decision inherited rather than invented. This mirrors
 * `SeedInstitutionLifecyclePermission`, which resolved the same problem.
 *
 * ⚠️ If the template capability does not exist on an environment, nothing is
 * granted and the deploy still succeeds: the permission row exists and can be
 * assigned by hand. That is preferable to guessing a role id. **After
 * deploying, confirm the intended administrators can still open
 * `/clarisa-panel/manage/glossary-admin`** — a 403 there means the grant has to
 * be assigned manually.
 *
 * Idempotent: run twice and nothing is duplicated.
 */
export class SeedGlossaryAdminPermission1786320000000
  implements MigrationInterface
{
  name = 'SeedGlossaryAdminPermission1786320000000';

  /**
   * Matched as a substring of the request path, hence no trailing segment.
   * Deliberately the full admin prefix and not `/api/glossary`: the public
   * read endpoint needs no permission, and a shorter value would let any
   * holder of it reach the admin routes too.
   */
  private static readonly ROUTE = '/api/glossary/admin';

  /** The capability the grant is copied from. */
  private static readonly TEMPLATE_ROUTE = '/api/institutions/create-bulk';

  /** Same technical user every seeded row in this table was created by. */
  private static readonly SEED_USER = 3043;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const route = SeedGlossaryAdminPermission1786320000000.ROUTE;
    const template = SeedGlossaryAdminPermission1786320000000.TEMPLATE_ROUTE;
    const seedUser = SeedGlossaryAdminPermission1786320000000.SEED_USER;

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    const route = SeedGlossaryAdminPermission1786320000000.ROUTE;

    // ⚠️ This also removes grants added by hand after the deploy. Reverting is
    // not a way back to the previous state of this table.
    await queryRunner.query(
      `DELETE rp FROM role_permission rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE p.name = ?`,
      [route],
    );

    await queryRunner.query(`DELETE FROM permissions WHERE name = ?`, [route]);
  }
}
