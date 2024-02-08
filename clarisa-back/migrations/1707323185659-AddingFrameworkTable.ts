import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingFrameworkTable1707323185659 implements MigrationInterface {
  name = 'AddingFrameworkTable1707323185659';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`frameworks\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`description\` text NULL, \`currently_in_use\` tinyint(1) NOT NULL DEFAULT 0, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` ADD \`framework_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` ADD CONSTRAINT \`FK_6737e1b1b0e2be0202d5b01d62d\` FOREIGN KEY (\`framework_id\`) REFERENCES \`frameworks\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`global_units\` DROP FOREIGN KEY \`FK_6737e1b1b0e2be0202d5b01d62d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` DROP COLUMN \`framework_id\``,
    );
    await queryRunner.query(`DROP TABLE \`frameworks\``);
  }
}
