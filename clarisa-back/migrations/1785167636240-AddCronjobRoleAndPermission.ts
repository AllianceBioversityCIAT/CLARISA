import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCronjobRoleAndPermission1785167636240
  implements MigrationInterface
{
  name = 'AddCronjobRoleAndPermission1785167636240';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO roles (description, acronym, \`order\`, created_at, created_by, is_active)
      SELECT 'Cronjob Executor', 'CRON_EXEC', 1, NOW(), 1, 1
      FROM DUAL
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE acronym = 'CRON_EXEC');
    `);

    await queryRunner.query(`
      INSERT INTO permissions (name, created_at, created_by, is_active)
      SELECT 'cronjobs', NOW(), 1, 1
      FROM DUAL
      WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'cronjobs');
    `);

    await queryRunner.query(`
      INSERT INTO role_permission (role_id, permission_id, created_at, created_by, is_active)
      SELECT r.id, p.id, NOW(), 1, 1
      FROM roles r, permissions p
      WHERE r.acronym = 'CRON_EXEC'
        AND p.name = 'cronjobs'
        AND NOT EXISTS (
          SELECT 1 FROM role_permission rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE rp FROM role_permission rp
      INNER JOIN roles r ON r.id = rp.role_id
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE r.acronym = 'CRON_EXEC' AND p.name = 'cronjobs';
    `);

    await queryRunner.query(
      `DELETE FROM permissions WHERE name = 'cronjobs';`,
    );

    await queryRunner.query(
      `DELETE FROM roles WHERE acronym = 'CRON_EXEC';`,
    );
  }
}
