import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIsoRelatedTables1701708105926 implements MigrationInterface {
  name = 'CreateIsoRelatedTables1701708105926';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`iso_country_names\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`full_name\` text NULL, \`short_name\` text NULL, \`country_id\` bigint NULL, \`iso_language_id\` bigint NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`iso_country_languages\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`is_administrative\` tinyint(1) NOT NULL DEFAULT 1, \`sorting_order\` text NULL, \`country_id\` bigint NOT NULL, \`iso_language_id\` bigint NOT NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`iso_languages\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NULL, \`iso_alpha_2\` varchar(64) NULL, \`iso_alpha_3\` varchar(64) NOT NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, UNIQUE INDEX \`IDX_b129d9b056ebce0abf00991462\` (\`iso_alpha_3\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`iso_subnational_categories\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`iso_category_id\` bigint NOT NULL, \`name\` text NULL, \`plural_name\` text NULL, \`country_id\` bigint NULL, \`iso_language_id\` bigint NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, INDEX \`IDX_777361e99dc290ae2da1a01802\` (\`iso_category_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`iso_subnational_scope\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`code\` varchar(20) NULL, \`name\` text NULL, \`local_name\` text NULL, \`romanization_system_name\` text NULL, \`country_id\` bigint NOT NULL, \`iso_language_id\` bigint NULL, \`iso_subnational_category_id\` bigint NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, INDEX \`IDX_c37fcfd0e717ec2677072748de\` (\`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_country_names\` ADD CONSTRAINT \`FK_822ab3cf64a351e7c1f056b14d1\` FOREIGN KEY (\`country_id\`) REFERENCES \`countries\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_country_names\` ADD CONSTRAINT \`FK_47e729478df85c4c06b9620190e\` FOREIGN KEY (\`iso_language_id\`) REFERENCES \`iso_languages\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_country_languages\` ADD CONSTRAINT \`FK_8b7a5b6e52d8adfeb22c7c0ded1\` FOREIGN KEY (\`country_id\`) REFERENCES \`countries\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_country_languages\` ADD CONSTRAINT \`FK_60e1069bcfd9af6fd8d3f80c9b8\` FOREIGN KEY (\`iso_language_id\`) REFERENCES \`iso_languages\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_subnational_categories\` ADD CONSTRAINT \`FK_2c8a680354b06cd137e129241ba\` FOREIGN KEY (\`country_id\`) REFERENCES \`countries\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_subnational_categories\` ADD CONSTRAINT \`FK_769988d8d3621bd237248d964b3\` FOREIGN KEY (\`iso_language_id\`) REFERENCES \`iso_languages\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_subnational_scope\` ADD CONSTRAINT \`FK_03982bd51dba352012c697af2d2\` FOREIGN KEY (\`country_id\`) REFERENCES \`countries\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_subnational_scope\` ADD CONSTRAINT \`FK_e201b7a92f777d2a350180c4cda\` FOREIGN KEY (\`iso_language_id\`) REFERENCES \`iso_languages\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_subnational_scope\` ADD CONSTRAINT \`FK_4d9c11e11e937eb08d300f183cc\` FOREIGN KEY (\`iso_subnational_category_id\`) REFERENCES \`iso_subnational_categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`iso_subnational_scope\` DROP FOREIGN KEY \`FK_4d9c11e11e937eb08d300f183cc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_subnational_scope\` DROP FOREIGN KEY \`FK_e201b7a92f777d2a350180c4cda\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_subnational_scope\` DROP FOREIGN KEY \`FK_03982bd51dba352012c697af2d2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_subnational_categories\` DROP FOREIGN KEY \`FK_769988d8d3621bd237248d964b3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_subnational_categories\` DROP FOREIGN KEY \`FK_2c8a680354b06cd137e129241ba\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_country_languages\` DROP FOREIGN KEY \`FK_60e1069bcfd9af6fd8d3f80c9b8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_country_languages\` DROP FOREIGN KEY \`FK_8b7a5b6e52d8adfeb22c7c0ded1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_country_names\` DROP FOREIGN KEY \`FK_47e729478df85c4c06b9620190e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`iso_country_names\` DROP FOREIGN KEY \`FK_822ab3cf64a351e7c1f056b14d1\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c37fcfd0e717ec2677072748de\` ON \`iso_subnational_scope\``,
    );
    await queryRunner.query(`DROP TABLE \`iso_subnational_scope\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_777361e99dc290ae2da1a01802\` ON \`iso_subnational_categories\``,
    );
    await queryRunner.query(`DROP TABLE \`iso_subnational_categories\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_b129d9b056ebce0abf00991462\` ON \`iso_languages\``,
    );
    await queryRunner.query(`DROP TABLE \`iso_languages\``);
    await queryRunner.query(`DROP TABLE \`iso_country_languages\``);
    await queryRunner.query(`DROP TABLE \`iso_country_names\``);
  }
}
