import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MELIAF Concepts Editor: a role whose members manage MELIAF concepts and
 * nothing else of the MELIAF Taxonomy admin.
 *
 * `PermissionGuard` authorises when the request path contains a permission
 * name. `/api/meliaf-taxonomy/admin/meliaf/concepts` therefore opens every
 * route under `.../admin/meliaf/concepts…` (create, edit, labels, relations,
 * mappings, status, merge, icons, the read-only `concepts-meta/*` copies of
 * fields and lists, and — by design — the concepts assistant
 * `concepts-assist/status|chat`) and none of lists, fields, collections,
 * import, requests, releases, usage or the other AI routes (`ai/*`).
 * `/api/meliaf-taxonomy/admin` keeps opening everything, so full admins see
 * no change.
 *
 * Strictly additive and idempotent: no DDL (the metadata columns come from
 * `AddRolesUsersAdmin1790600000000`); every insert is behind NOT EXISTS and
 * the relabel of the full-admin permission only touches a label that is NULL
 * or still the one that migration wrote (a label edited by hand is kept).
 * `down()` removes exactly what `up()` added.
 */
export class AddMeliafConceptsEditorRole1790600100000
  implements MigrationInterface
{
  name = 'AddMeliafConceptsEditorRole1790600100000';

  static readonly CONCEPTS_ROUTE = '/api/meliaf-taxonomy/admin/meliaf/concepts';
  static readonly FULL_ROUTE = '/api/meliaf-taxonomy/admin';
  static readonly ROLE_ACRONYM = 'MELIAF_CE';
  static readonly ROLE_DESCRIPTION = 'MELIAF Concepts Editor';
  static readonly FULL_LABEL_OLD = 'Manage the MELIAF Taxonomy';
  static readonly FULL_LABEL_NEW = 'MELIAF Taxonomy — Full administration';
  /** Same technical user every seeded row was created by. */
  private static readonly SEED_USER = 3043;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = AddMeliafConceptsEditorRole1790600100000;

    // `name` is TEXT (no unique index possible): explicit lookup.
    await queryRunner.query(
      `INSERT INTO permissions (name, module, label, description, is_active, created_by)
       SELECT ?, ?, ?, ?, 1, ? FROM DUAL
        WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = ?)`,
      [
        cls.CONCEPTS_ROUTE,
        'MELIAF Taxonomy',
        'Manage concepts',
        'Create and edit MELIAF concepts: labels, relations, mappings, icons, approve or deprecate and merge. Does not include lists, custom fields, collections, import, requests, releases or usage.',
        cls.SEED_USER,
        cls.CONCEPTS_ROUTE,
      ],
    );

    // The next `order` comes from a derived table (materialised, so MySQL
    // accepts `roles` as both target and source). The WHERE sits outside the
    // aggregate: an aggregate filtered to zero rows still returns one row.
    await queryRunner.query(
      `INSERT INTO roles (description, acronym, \`order\`, is_system, level, is_active, created_by)
       SELECT ?, ?, t.next_order, 0, 'module', 1, ?
         FROM (SELECT COALESCE(MAX(\`order\`), 0) + 1 AS next_order FROM roles) t
        WHERE NOT EXISTS (SELECT 1 FROM roles WHERE acronym = ?)`,
      [cls.ROLE_DESCRIPTION, cls.ROLE_ACRONYM, cls.SEED_USER, cls.ROLE_ACRONYM],
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
      [cls.SEED_USER, cls.CONCEPTS_ROUTE, cls.ROLE_ACRONYM],
    );

    await queryRunner.query(
      `UPDATE permissions SET label = ?, updated_at = updated_at
        WHERE name = ? AND (label IS NULL OR label = ?)`,
      [cls.FULL_LABEL_NEW, cls.FULL_ROUTE, cls.FULL_LABEL_OLD],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cls = AddMeliafConceptsEditorRole1790600100000;

    await queryRunner.query(
      `UPDATE permissions SET label = ?, updated_at = updated_at
        WHERE name = ? AND label = ?`,
      [cls.FULL_LABEL_OLD, cls.FULL_ROUTE, cls.FULL_LABEL_NEW],
    );
    // ⚠️ Also removes grants and memberships added from the screen.
    await queryRunner.query(
      `DELETE rp FROM role_permission rp
         JOIN permissions p ON p.id = rp.permission_id
        WHERE p.name = ?`,
      [cls.CONCEPTS_ROUTE],
    );
    await queryRunner.query(
      `DELETE rp FROM role_permission rp
         JOIN roles r ON r.id = rp.role_id
        WHERE r.acronym = ?`,
      [cls.ROLE_ACRONYM],
    );
    await queryRunner.query(
      `DELETE ur FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
        WHERE r.acronym = ?`,
      [cls.ROLE_ACRONYM],
    );
    await queryRunner.query(`DELETE FROM roles WHERE acronym = ?`, [
      cls.ROLE_ACRONYM,
    ]);
    await queryRunner.query(`DELETE FROM permissions WHERE name = ?`, [
      cls.CONCEPTS_ROUTE,
    ]);
  }
}
