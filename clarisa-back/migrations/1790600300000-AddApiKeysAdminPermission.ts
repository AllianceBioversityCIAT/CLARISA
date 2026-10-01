import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * API keys administration becomes admin-only.
 *
 * `ApiKeyController` (`/api/api-keys/*`: create, list, scopes, usage, edit,
 * revoke, rotate, delete) now carries `PermissionGuard`, which authorises when
 * the request path contains a permission name. This adds the permission
 * `/api/api-keys` ("Manage API keys and usage") and grants it to SA only, so
 * super admins keep every screen and nobody else can issue or read keys.
 * `/api/auth/validate-api-key` (external systems) is a different route and is
 * not affected.
 *
 * Idempotent: `name` is TEXT (no unique index possible), so the insert and the
 * grant are guarded by NOT EXISTS, and the metadata only fills NULL columns (a
 * label edited by hand is kept). `down()` removes exactly what `up()` added.
 */
export class AddApiKeysAdminPermission1790600300000
  implements MigrationInterface
{
  name = 'AddApiKeysAdminPermission1790600300000';

  static readonly ROUTE = '/api/api-keys';
  static readonly MODULE = 'Systems and API keys';
  static readonly LABEL = 'Manage API keys and usage';
  static readonly DESCRIPTION =
    'Create, edit, rotate and revoke the API keys of connected systems, and see how CLARISA is used.';
  static readonly ROLE_ACRONYM = 'SA';
  /** Same technical user every seeded permission row was created by. */
  private static readonly SEED_USER = 3043;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = AddApiKeysAdminPermission1790600300000;

    await queryRunner.query(
      `INSERT INTO permissions (name, module, label, description, is_active, created_by)
       SELECT ?, ?, ?, ?, 1, ? FROM DUAL
        WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = ?)`,
      [
        cls.ROUTE,
        cls.MODULE,
        cls.LABEL,
        cls.DESCRIPTION,
        cls.SEED_USER,
        cls.ROUTE,
      ],
    );

    // A row created earlier by hand, without metadata, gets it; one with a
    // label keeps it.
    await queryRunner.query(
      `UPDATE permissions
          SET module = COALESCE(module, ?),
              label = COALESCE(label, ?),
              description = COALESCE(description, ?),
              updated_at = updated_at
        WHERE name = ?`,
      [cls.MODULE, cls.LABEL, cls.DESCRIPTION, cls.ROUTE],
    );

    await queryRunner.query(
      `INSERT INTO role_permission (role_id, permission_id, is_active, created_by)
       SELECT r.id, p.id, 1, ?
         FROM roles r
         JOIN permissions p ON p.name = ?
        WHERE r.acronym = ?
          AND NOT EXISTS (
            SELECT 1 FROM role_permission rp
             WHERE rp.role_id = r.id AND rp.permission_id = p.id
          )`,
      [cls.SEED_USER, cls.ROUTE, cls.ROLE_ACRONYM],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const route = AddApiKeysAdminPermission1790600300000.ROUTE;
    // ⚠️ Also removes grants of this permission added from the screen.
    await queryRunner.query(
      `DELETE rp FROM role_permission rp
         JOIN permissions p ON p.id = rp.permission_id
        WHERE p.name = ?`,
      [route],
    );
    await queryRunner.query(`DELETE FROM permissions WHERE name = ?`, [route]);
  }
}
