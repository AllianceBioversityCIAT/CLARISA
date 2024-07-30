import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingMicroservicesStructure1720447128706
  implements MigrationInterface
{
  name = 'AddingMicroservicesStructure1720447128706';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`environments\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`acronym\` text NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`application_secrets\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`relation_uuid\` text NOT NULL, \`secret\` text NOT NULL, \`sender_mis_id\` bigint NOT NULL, \`receiver_mis_id\` bigint NOT NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`mises\` ADD \`environment_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`application_secrets\` ADD CONSTRAINT \`FK_c8eee06ff91d0a8f52a16ae6a18\` FOREIGN KEY (\`receiver_mis_id\`) REFERENCES \`mises\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`application_secrets\` ADD CONSTRAINT \`FK_2a214f00ec53b82439871914f87\` FOREIGN KEY (\`sender_mis_id\`) REFERENCES \`mises\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`mises\` ADD CONSTRAINT \`FK_4d725036a12dba350325c9064d8\` FOREIGN KEY (\`environment_id\`) REFERENCES \`environments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`mises\` DROP FOREIGN KEY \`FK_4d725036a12dba350325c9064d8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`application_secrets\` DROP FOREIGN KEY \`FK_2a214f00ec53b82439871914f87\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`application_secrets\` DROP FOREIGN KEY \`FK_c8eee06ff91d0a8f52a16ae6a18\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`mises\` DROP COLUMN \`environment_id\``,
    );
    await queryRunner.query(`DROP TABLE \`application_secrets\``);
    await queryRunner.query(`DROP TABLE \`environments\``);
  }
}
