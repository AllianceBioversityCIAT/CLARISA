import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Roles and users administration (MELIAF Data Admins, Héctor 2026-09-29).
 *
 * Strictly additive:
 * - `permissions.module/label/description` (NULL): plain wording for the
 *   panel. `name` stays the value `PermissionGuard` matches, untouched.
 * - `roles.is_system` (0/1) and `roles.level` (`super` | `user_admin` |
 *   `module`): which roles the screen may edit and who may grant them.
 * - Permission `/api/access-admin` ("Manage roles and users"), granted to SA.
 *
 * No grant, role or membership that exists today changes, so every user keeps
 * exactly the access they have. Idempotent: MySQL DDL auto-commits, so each
 * column is checked in `information_schema` before the ALTER, and every data
 * write is guarded by NOT EXISTS / COALESCE (a second run changes nothing and
 * never overwrites a label edited by hand). `down()` removes exactly what
 * `up()` added.
 */
export class AddRolesUsersAdmin1790600000000 implements MigrationInterface {
  name = 'AddRolesUsersAdmin1790600000000';

  static readonly ACCESS_ADMIN_ROUTE = '/api/access-admin';
  /** Same technical user every seeded permission row was created by. */
  private static readonly SEED_USER = 3043;
  private static readonly SYSTEM_ROLES = [
    'SA',
    'MS',
    'CRON_EXEC',
    'RQAT',
    'OU',
  ];

  /**
   * Plain wording for the permissions known to the code. A row whose name is
   * not here keeps NULL metadata; the API then shows its technical name under
   * the "Other" module, so nothing is hidden.
   */
  private static readonly METADATA: ReadonlyArray<
    [name: string, module: string, label: string, description: string]
  > = [
    [
      '/api/access-admin',
      'Access',
      'Manage roles and users',
      'Create roles, choose what each role can open and assign roles to people.',
    ],
    [
      '/api/users',
      'Access',
      'Edit user records',
      'Update the stored details of CLARISA users.',
    ],
    [
      '/api/roles',
      'Access',
      'Manage roles (legacy)',
      'Legacy access to the roles API.',
    ],
    [
      '/api/permissions',
      'Access',
      'Manage permissions (legacy)',
      'Legacy access to the permissions API.',
    ],
    [
      '/api/institutions',
      'Institutions',
      'Manage institutions',
      'Create and edit institutions.',
    ],
    [
      '/api/institutions/update',
      'Institutions',
      'Edit institutions',
      'Change the data of existing institutions.',
    ],
    [
      '/api/institutions/create-bulk',
      'Institutions',
      'Create institutions in bulk',
      'Load many institutions at once from a file.',
    ],
    [
      '/api/institutions/lifecycle',
      'Institutions',
      'Manage institution validity and lineage',
      'Set end dates and predecessor/successor links of institutions.',
    ],
    [
      '/api/partner-requests',
      'Institution requests',
      'Manage institution requests',
      'Every action on requests to add a new institution.',
    ],
    [
      '/api/partner-requests/create',
      'Institution requests',
      'Submit institution requests',
      'Ask for a new institution to be added.',
    ],
    [
      '/api/partner-requests/create-bulk',
      'Institution requests',
      'Submit institution requests in bulk',
      'Send many institution requests at once.',
    ],
    [
      '/api/partner-requests/respond',
      'Institution requests',
      'Accept or reject institution requests',
      'Review pending institution requests and decide on them.',
    ],
    [
      '/api/partner-requests/update',
      'Institution requests',
      'Edit institution requests',
      'Correct the data of a pending institution request.',
    ],
    [
      '/api/country-office-requests',
      'Institution requests',
      'Manage country office requests',
      'Every action on requests for new country offices.',
    ],
    [
      '/api/country-office-requests/create',
      'Institution requests',
      'Submit country office requests',
      'Ask for a new country office of an institution.',
    ],
    [
      '/api/country-office-requests/respond',
      'Institution requests',
      'Accept or reject country office requests',
      'Review pending country office requests and decide on them.',
    ],
    [
      '/api/country-office-requests/update',
      'Institution requests',
      'Edit country office requests',
      'Correct the data of a pending country office request.',
    ],
    [
      '/api/glossary/admin',
      'Glossary',
      'Manage the glossary',
      'Create, edit and deactivate glossary terms, including bulk loads.',
    ],
    [
      '/api/meliaf-taxonomy/admin',
      'MELIAF Taxonomy',
      'Manage the MELIAF Taxonomy',
      'Create, edit, import and publish the MELIAF Taxonomy concepts.',
    ],
    [
      '/api/global-concepts/admin',
      'MELIAF Taxonomy',
      'Manage the MELIAF Taxonomy (old route)',
      'Old route of the MELIAF Taxonomy admin.',
    ],
    [
      '/api/mises',
      'Systems and API keys',
      'Manage connected systems',
      'Every action on the systems (MIS) connected to CLARISA.',
    ],
    [
      '/api/mises/create',
      'Systems and API keys',
      'Register connected systems',
      'Add a new system (MIS) that consumes CLARISA.',
    ],
    [
      '/api/mises/activate',
      'Systems and API keys',
      'Reactivate connected systems',
      'Turn a deactivated system (MIS) back on.',
    ],
    [
      '/api/mises/deactivate',
      'Systems and API keys',
      'Deactivate connected systems',
      'Turn off a system (MIS) and its access.',
    ],
    [
      '/api/app-secrets',
      'Systems and API keys',
      'Manage application secrets',
      'Create and validate the secrets systems use to call CLARISA.',
    ],
    [
      '/api/app-secrets/create',
      'Systems and API keys',
      'Create application secrets',
      'Issue a new secret for a system.',
    ],
    [
      '/api/app-secrets/validate',
      'Systems and API keys',
      'Validate application secrets',
      'Check whether a system secret is valid.',
    ],
    [
      '/api/qa-token',
      'Systems and API keys',
      'Request QA tokens',
      'Get a token for the Quality Assurance platform.',
    ],
    [
      '/auth/qa-token-auth/create',
      'Systems and API keys',
      'Create QA tokens',
      'Issue tokens for the Quality Assurance platform.',
    ],
    [
      'cronjobs',
      'Automation',
      'Run scheduled jobs',
      'Trigger the synchronisation jobs (OST, W3, phases, parameters).',
    ],
    [
      '/integration/cronjobs',
      'Automation',
      'Run scheduled jobs',
      'Trigger the synchronisation jobs (OST, W3, phases, parameters).',
    ],
    [
      '/integration/open-search',
      'Search',
      'Use OpenSearch',
      'Search and rebuild the OpenSearch indexes.',
    ],
    [
      '/api/bi-parameters',
      'Reports',
      'Manage BI parameters',
      'Edit the parameters of the BI reports.',
    ],
    [
      '/api/hp-clarisa-endpoints',
      'Public documentation',
      'Manage documented endpoints',
      'Edit the endpoints listed in the public documentation.',
    ],
    [
      '/api/hp-clarisa-categories',
      'Public documentation',
      'Manage documentation categories',
      'Edit the categories of the public documentation.',
    ],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = AddRolesUsersAdmin1790600000000;

    await this.addColumn(
      queryRunner,
      'permissions',
      'module',
      'varchar(50) NULL',
    );
    await this.addColumn(
      queryRunner,
      'permissions',
      'label',
      'varchar(255) NULL',
    );
    await this.addColumn(
      queryRunner,
      'permissions',
      'description',
      'text NULL',
    );
    await this.addColumn(
      queryRunner,
      'roles',
      'is_system',
      'tinyint NOT NULL DEFAULT 0',
    );
    await this.addColumn(
      queryRunner,
      'roles',
      'level',
      "varchar(20) NOT NULL DEFAULT 'module'",
    );

    // Technical classification only: `updated_at = updated_at` keeps the
    // rows' last-edit date, nobody edited them.
    await queryRunner.query(
      `UPDATE roles SET is_system = 1, updated_at = updated_at
        WHERE acronym IN (?) AND is_system = 0`,
      [cls.SYSTEM_ROLES],
    );
    await queryRunner.query(
      `UPDATE roles SET level = 'super', updated_at = updated_at
        WHERE acronym = 'SA' AND level <> 'super'`,
    );
    await queryRunner.query(
      `UPDATE roles SET level = 'user_admin', updated_at = updated_at
        WHERE acronym = 'UM' AND level <> 'user_admin'`,
    );

    // `name` is TEXT (no unique index possible): explicit lookup.
    await queryRunner.query(
      `INSERT INTO permissions (name, is_active, created_by)
       SELECT ?, 1, ? FROM DUAL
        WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = ?)`,
      [cls.ACCESS_ADMIN_ROUTE, cls.SEED_USER, cls.ACCESS_ADMIN_ROUTE],
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
      [cls.SEED_USER, cls.ACCESS_ADMIN_ROUTE],
    );

    for (const [name, module, label, description] of cls.METADATA) {
      await queryRunner.query(
        `UPDATE permissions
            SET module = COALESCE(module, ?),
                label = COALESCE(label, ?),
                description = COALESCE(description, ?),
                updated_at = updated_at
          WHERE name = ?`,
        [module, label, description, name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const route = AddRolesUsersAdmin1790600000000.ACCESS_ADMIN_ROUTE;
    // ⚠️ Also removes grants of this permission added from the screen.
    await queryRunner.query(
      `DELETE rp FROM role_permission rp
         JOIN permissions p ON p.id = rp.permission_id
        WHERE p.name = ?`,
      [route],
    );
    await queryRunner.query(`DELETE FROM permissions WHERE name = ?`, [route]);

    await this.dropColumn(queryRunner, 'roles', 'level');
    await this.dropColumn(queryRunner, 'roles', 'is_system');
    await this.dropColumn(queryRunner, 'permissions', 'description');
    await this.dropColumn(queryRunner, 'permissions', 'label');
    await this.dropColumn(queryRunner, 'permissions', 'module');
  }

  private async columnExists(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<boolean> {
    const rows: Array<{ n: number | string }> = await queryRunner.query(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    );
    return Number(rows?.[0]?.n ?? 0) > 0;
  }

  private async addColumn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    definition: string,
  ): Promise<void> {
    if (!(await this.columnExists(queryRunner, table, column))) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
      );
    }
  }

  private async dropColumn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<void> {
    if (await this.columnExists(queryRunner, table, column)) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``,
      );
    }
  }
}
