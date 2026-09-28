import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registers the permission of the Global Concepts admin surface
 * (`/api/global-concepts/admin`) and grants it to whoever already administers
 * the glossary (`/api/glossary/admin`): the catalogue curators who manage terms
 * today are the natural first admins of the concepts module.
 *
 * These two rows are the only data the module writes outside its own `gc_`
 * tables. `PermissionGuard` authorises by substring on the request path, so the
 * full admin prefix is used: the public read (`/api/global-concepts/...`) needs
 * no permission, and a shorter value would let any holder reach the admin routes.
 *
 * ⚠️ If the template grant does not exist on an environment, nothing is granted
 * and the deploy still succeeds; the permission can be assigned by hand. After
 * deploying, confirm the intended admins can open the Global Concepts section.
 *
 * Idempotent, mirroring `SeedGlossaryAdminPermission1786320000000`.
 */
export class SeedGlobalConceptsAdminPermission1790500100000
  implements MigrationInterface
{
  name = 'SeedGlobalConceptsAdminPermission1790500100000';

  static readonly ROUTE = '/api/global-concepts/admin';
  private static readonly TEMPLATE_ROUTE = '/api/glossary/admin';
  /** Same technical user every seeded permission row was created by. */
  private static readonly SEED_USER = 3043;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const route = SeedGlobalConceptsAdminPermission1790500100000.ROUTE;
    const template =
      SeedGlobalConceptsAdminPermission1790500100000.TEMPLATE_ROUTE;
    const seedUser = SeedGlobalConceptsAdminPermission1790500100000.SEED_USER;

    // `name` is TEXT, so it cannot carry a unique index: explicit lookup.
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
    const route = SeedGlobalConceptsAdminPermission1790500100000.ROUTE;

    // ⚠️ Also removes grants added by hand after the deploy.
    await queryRunner.query(
      `DELETE rp FROM role_permission rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE p.name = ?`,
      [route],
    );
    await queryRunner.query(`DELETE FROM permissions WHERE name = ?`, [route]);
  }
}
