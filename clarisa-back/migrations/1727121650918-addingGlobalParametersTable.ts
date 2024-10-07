import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingGlobalParametersTable1727121650918
  implements MigrationInterface
{
  name = 'AddingGlobalParametersTable1727121650918';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`global_parameters\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(64) NOT NULL, \`description\` text NOT NULL, \`value\` text NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, UNIQUE INDEX \`IDX_ed56900977659dec40883a4867\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`global_parameters\``);
  }
}
