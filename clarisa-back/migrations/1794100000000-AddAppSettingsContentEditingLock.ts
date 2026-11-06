import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Parameters page (Yeck, 2026-11-06): a switch that pauses creating and
 * editing glossary terms and taxonomy concepts while adjustments are made.
 *
 * - Table `app_settings` (key → text value, who and when changed it), with
 *   `content_editing_locked = 'false'`: nothing is locked by this deploy.
 * - Permission `/api/settings` ("Change platform parameters"), granted to the
 *   Super admin role (`SA`), the only one that may turn the switch.
 *
 * Idempotent (CREATE TABLE IF NOT EXISTS, NOT EXISTS guards). `down()`
 * removes exactly what `up()` added.
 */
export class AddAppSettingsContentEditingLock1794100000000
  implements MigrationInterface
{
  name = 'AddAppSettingsContentEditingLock1794100000000';

  static readonly ROUTE = '/api/settings';
  static readonly KEY = 'content_editing_locked';
  /** Same technical user every seeded permission row was created by. */
  private static readonly SEED_USER = 3043;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = AddAppSettingsContentEditingLock1794100000000;
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS app_settings (
         setting_key VARCHAR(100) NOT NULL,
         value TEXT NULL,
         updated_at TIMESTAMP NULL,
         updated_by_email VARCHAR(255) NULL,
         PRIMARY KEY (setting_key)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    await queryRunner.query(
      `INSERT INTO app_settings (setting_key, value)
       SELECT ?, 'false' FROM DUAL
        WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE setting_key = ?)`,
      [cls.KEY, cls.KEY],
    );
    // `permissions.name` is TEXT (no unique index): explicit lookup.
    await queryRunner.query(
      `INSERT INTO permissions (name, is_active, created_by)
       SELECT ?, 1, ? FROM DUAL
        WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = ?)`,
      [cls.ROUTE, cls.SEED_USER, cls.ROUTE],
    );
    await queryRunner.query(
      `UPDATE permissions
          SET module = COALESCE(module, 'Settings'),
              label = COALESCE(label, 'Change platform parameters'),
              description = COALESCE(description, 'Pause or resume creating and editing glossary terms and taxonomy concepts.'),
              updated_at = updated_at
        WHERE name = ?`,
      [cls.ROUTE],
    );
    await queryRunner.query(
      `INSERT INTO role_permission (role_id, permission_id, is_active, created_by)
       SELECT r.id, p.id, 1, ?
         FROM roles r
         JOIN permissions p ON p.name = ?
        WHERE r.acronym = 'SA'
          AND NOT EXISTS (
            SELECT 1 FROM role_permission rp
             WHERE rp.role_id = r.id AND rp.permission_id = p.id
          )`,
      [cls.SEED_USER, cls.ROUTE],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cls = AddAppSettingsContentEditingLock1794100000000;
    await queryRunner.query(
      `DELETE rp FROM role_permission rp
         JOIN permissions p ON p.id = rp.permission_id
        WHERE p.name = ?`,
      [cls.ROUTE],
    );
    await queryRunner.query(`DELETE FROM permissions WHERE name = ?`, [
      cls.ROUTE,
    ]);
    await queryRunner.query(`DROP TABLE IF EXISTS app_settings`);
  }
}
