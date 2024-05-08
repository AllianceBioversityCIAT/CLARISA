import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingNewTablesCGIARPortfolio1713379066125
  implements MigrationInterface
{
  name = 'AddingNewTablesCGIARPortfolio1713379066125';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`funding_sources\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`description\` text NULL, \`type_term\` text NULL, \`funding_to\` text NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`portfolios\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`start_date\` timestamp NULL, \`end_date\` timestamp NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` ADD \`definition\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` ADD \`prefix\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` ADD \`level\` bigint NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` ADD \`parent_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` ADD \`funding_source_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` ADD \`portfolio_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` ADD \`short_name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` ADD \`start_date\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` ADD \`end_date\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` ADD \`level\` bigint NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` ADD \`portfolio_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` ADD \`parent_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` CHANGE \`acronym\` \`acronym\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` CHANGE \`name\` \`name\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` ADD CONSTRAINT \`FK_f79903febe7d404f309cc525bf0\` FOREIGN KEY (\`parent_id\`) REFERENCES \`global_unit_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` ADD CONSTRAINT \`FK_4649924b47b05753ccf90f1cace\` FOREIGN KEY (\`funding_source_id\`) REFERENCES \`funding_sources\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` ADD CONSTRAINT \`FK_92aeff5dd99c0c3736ecda046f1\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`portfolios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` ADD CONSTRAINT \`FK_bed6b12ce70f2912623e99d8cc7\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`portfolios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` ADD CONSTRAINT \`FK_f90b3f8b90420da5cbe9c77bdf5\` FOREIGN KEY (\`parent_id\`) REFERENCES \`global_units\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`global_units\` DROP FOREIGN KEY \`FK_f90b3f8b90420da5cbe9c77bdf5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` DROP FOREIGN KEY \`FK_bed6b12ce70f2912623e99d8cc7\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` DROP FOREIGN KEY \`FK_92aeff5dd99c0c3736ecda046f1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` DROP FOREIGN KEY \`FK_4649924b47b05753ccf90f1cace\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` DROP FOREIGN KEY \`FK_f79903febe7d404f309cc525bf0\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` CHANGE \`name\` \`name\` text CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` CHANGE \`acronym\` \`acronym\` text CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` DROP COLUMN \`parent_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` DROP COLUMN \`portfolio_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` DROP COLUMN \`level\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` DROP COLUMN \`end_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` DROP COLUMN \`start_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` DROP COLUMN \`short_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` DROP COLUMN \`portfolio_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` DROP COLUMN \`funding_source_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` DROP COLUMN \`parent_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` DROP COLUMN \`level\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` DROP COLUMN \`prefix\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_unit_types\` DROP COLUMN \`definition\``,
    );
    await queryRunner.query(`DROP TABLE \`portfolios\``);
    await queryRunner.query(`DROP TABLE \`funding_sources\``);
  }
}
