import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingCenterEntity1714146643515 implements MigrationInterface {
  name = 'AddingCenterEntity1714146643515';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`centers\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`acronym\` text NOT NULL, \`smo_code\` text NULL, \`financial_code\` text NULL, \`institution_id\` bigint NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`centers\` ADD CONSTRAINT \`FK_7e58ce510bf603084b35b1293e8\` FOREIGN KEY (\`institution_id\`) REFERENCES \`institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`centers\` DROP FOREIGN KEY \`FK_7e58ce510bf603084b35b1293e8\``,
    );
    await queryRunner.query(`DROP TABLE \`centers\``);
  }
}
