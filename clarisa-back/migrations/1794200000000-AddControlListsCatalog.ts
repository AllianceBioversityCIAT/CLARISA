import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Control lists: catalog tables, permissions and roles.
 *
 * The catalog (`cl_lists`, `cl_fields`, `cl_schema_ops`) lives in the main
 * schema, so its own structure evolves through this same migration channel.
 * The TABLES users create are never part of a migration: the engine creates
 * them at runtime as `cl_<code>`, in CLARISA's own database by default (or in
 * another one when `CONTROL_LISTS_DB_NAME` is set).
 *
 * `PermissionGuard` authorises when the request path contains a permission
 * name:
 *   /api/control-lists/admin         → everything (granted to SA)
 *   /api/control-lists/admin/schema  → design lists
 *   /api/control-lists/admin/data    → edit records
 * None of them is a prefix of an existing permission, nor the other way round.
 *
 * Strictly additive: no existing table is altered. Every insert is behind
 * NOT EXISTS. `down()` refuses to drop the catalog while it describes a list
 * (its tables would be left without description).
 */
export class AddControlListsCatalog1794200000000 implements MigrationInterface {
  name = 'AddControlListsCatalog1794200000000';

  static readonly FULL_ROUTE = '/api/control-lists/admin';
  static readonly SCHEMA_ROUTE = '/api/control-lists/admin/schema';
  static readonly DATA_ROUTE = '/api/control-lists/admin/data';
  /** Same technical user every seeded row was created by. */
  private static readonly SEED_USER = 3043;

  static readonly PERMISSIONS: Array<[string, string, string]> = [
    [
      AddControlListsCatalog1794200000000.FULL_ROUTE,
      'Control lists — Full administration',
      'Design every control list and edit its records.',
    ],
    [
      AddControlListsCatalog1794200000000.SCHEMA_ROUTE,
      'Design control lists',
      'Create control lists, add, rename, retype and delete their fields, publish and delete them. Only lists owned by a role the user holds.',
    ],
    [
      AddControlListsCatalog1794200000000.DATA_ROUTE,
      'Edit control list records',
      'Create, edit and deactivate records of published control lists. Only lists owned by a role the user holds.',
    ],
  ];

  /** acronym, description, permission routes. */
  static readonly ROLES: Array<[string, string, string[]]> = [
    [
      'CL_DESIGNER',
      'Control Lists Designer',
      [
        AddControlListsCatalog1794200000000.SCHEMA_ROUTE,
        AddControlListsCatalog1794200000000.DATA_ROUTE,
      ],
    ],
    [
      'CL_EDITOR',
      'Control Lists Editor',
      [AddControlListsCatalog1794200000000.DATA_ROUTE],
    ],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = AddControlListsCatalog1794200000000;

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cl_lists (
        id BIGINT NOT NULL AUTO_INCREMENT,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        description VARCHAR(500) NULL,
        owner_role_id BIGINT NOT NULL,
        table_name VARCHAR(64) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_by BIGINT NULL,
        updated_by BIGINT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_cl_lists_code (code),
        UNIQUE KEY uq_cl_lists_table (table_name),
        KEY ix_cl_lists_owner (owner_role_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cl_fields (
        id BIGINT NOT NULL AUTO_INCREMENT,
        list_id BIGINT NOT NULL,
        code VARCHAR(50) NOT NULL,
        label VARCHAR(150) NOT NULL,
        type VARCHAR(30) NOT NULL,
        column_name VARCHAR(64) NOT NULL,
        is_required TINYINT(1) NOT NULL DEFAULT 0,
        is_unique TINYINT(1) NOT NULL DEFAULT 0,
        is_indexed TINYINT(1) NOT NULL DEFAULT 0,
        relation_list_id BIGINT NULL,
        position INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        created_by BIGINT NULL,
        updated_by BIGINT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_cl_fields_code (list_id, code),
        KEY ix_cl_fields_rel (relation_list_id),
        CONSTRAINT fk_cl_fields_list FOREIGN KEY (list_id) REFERENCES cl_lists (id),
        CONSTRAINT fk_cl_fields_rel FOREIGN KEY (relation_list_id) REFERENCES cl_lists (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);

    // The log: written BEFORE each DDL statement, because MySQL cannot roll a
    // DDL statement back. `intent_json` holds the catalog step as data (kind +
    // ids), never SQL. No foreign key to cl_lists: the history of a deleted
    // list is kept.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cl_schema_ops (
        id BIGINT NOT NULL AUTO_INCREMENT,
        request_id VARCHAR(64) NOT NULL,
        list_id BIGINT NULL,
        kind VARCHAR(40) NOT NULL,
        sql_text TEXT NOT NULL,
        intent_json TEXT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        error_text TEXT NULL,
        created_by BIGINT NULL,
        started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_cl_ops_request (request_id),
        KEY ix_cl_ops_status (status, list_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);

    // `name` is TEXT (no unique index possible): explicit lookup.
    for (const [name, label, description] of cls.PERMISSIONS) {
      await queryRunner.query(
        `INSERT INTO permissions (name, module, label, description, is_active, created_by)
         SELECT ?, ?, ?, ?, 1, ? FROM DUAL
          WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = ?)`,
        [name, 'Control lists', label, description, cls.SEED_USER, name],
      );
    }

    for (const [acronym, description, routes] of cls.ROLES) {
      // Derived table (materialised) so MySQL accepts `roles` as target and source.
      await queryRunner.query(
        `INSERT INTO roles (description, acronym, \`order\`, is_system, level, is_active, created_by)
         SELECT ?, ?, t.next_order, 0, 'module', 1, ?
           FROM (SELECT COALESCE(MAX(\`order\`), 0) + 1 AS next_order FROM roles) t
          WHERE NOT EXISTS (SELECT 1 FROM roles WHERE acronym = ?)`,
        [description, acronym, cls.SEED_USER, acronym],
      );
      for (const route of routes) {
        await this.grant(queryRunner, acronym, route);
      }
    }
    await this.grant(queryRunner, 'SA', cls.FULL_ROUTE);
  }

  private async grant(
    queryRunner: QueryRunner,
    acronym: string,
    route: string,
  ): Promise<void> {
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
      [AddControlListsCatalog1794200000000.SEED_USER, route, acronym],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cls = AddControlListsCatalog1794200000000;

    const [{ n }] = await queryRunner.query(
      `SELECT COUNT(*) AS n FROM cl_lists`,
    );
    if (Number(n) > 0) {
      throw new Error(
        `AddControlListsCatalog: ${n} control list(s) exist. Delete them from the panel before reverting; dropping the catalog would leave their tables undescribed.`,
      );
    }

    const routes = cls.PERMISSIONS.map(([name]) => name);
    const acronyms = cls.ROLES.map(([acronym]) => acronym);
    const marks = (a: unknown[]) => a.map(() => '?').join(',');

    // ⚠️ Also removes grants and memberships added from the screen.
    await queryRunner.query(
      `DELETE rp FROM role_permission rp
         JOIN permissions p ON p.id = rp.permission_id
        WHERE p.name IN (${marks(routes)})`,
      routes,
    );
    await queryRunner.query(
      `DELETE rp FROM role_permission rp
         JOIN roles r ON r.id = rp.role_id
        WHERE r.acronym IN (${marks(acronyms)})`,
      acronyms,
    );
    await queryRunner.query(
      `DELETE ur FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
        WHERE r.acronym IN (${marks(acronyms)})`,
      acronyms,
    );
    await queryRunner.query(
      `DELETE FROM roles WHERE acronym IN (${marks(acronyms)})`,
      acronyms,
    );
    await queryRunner.query(
      `DELETE FROM permissions WHERE name IN (${marks(routes)})`,
      routes,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS cl_schema_ops`);
    await queryRunner.query(`DROP TABLE IF EXISTS cl_fields`);
    await queryRunner.query(`DROP TABLE IF EXISTS cl_lists`);
  }
}
