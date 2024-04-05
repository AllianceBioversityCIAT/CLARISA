import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeExistingAAOISchema1712249331065
  implements MigrationInterface
{
  name = 'ChangeExistingAAOISchema1712249331065';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`action_areas\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`smo_code\` varchar(20) NULL, \`description\` text NULL, \`name\` varchar(100) NULL, \`icon\` text NULL, \`color\` text NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`outcomes\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`smo_code\` varchar(20) NULL, \`outcome_statement\` text NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`action_area_outcomes\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`outcome_id\` bigint NULL, \`action_area_id\` bigint NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`indicators\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`smo_code\` varchar(20) NULL, \`outcome_indicator_statement\` text NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`action_area_outcome_indicators\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`action_area_outcome_id\` bigint NULL, \`indicator_id\` bigint NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`action_area_outcomes\` ADD CONSTRAINT \`FK_b129bf5ec7f08d753ffafdb24cd\` FOREIGN KEY (\`outcome_id\`) REFERENCES \`outcomes\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`action_area_outcomes\` ADD CONSTRAINT \`FK_2a3c1a31a5b3c076bed53e33659\` FOREIGN KEY (\`action_area_id\`) REFERENCES \`action_areas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`action_area_outcome_indicators\` ADD CONSTRAINT \`FK_330bc0bb47857fade96a156d0c8\` FOREIGN KEY (\`action_area_outcome_id\`) REFERENCES \`action_area_outcomes\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`action_area_outcome_indicators\` ADD CONSTRAINT \`FK_3919d38ee1e0eb3bfb84a108d17\` FOREIGN KEY (\`indicator_id\`) REFERENCES \`indicators\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`action_area_outcome_indicators\` DROP FOREIGN KEY \`FK_3919d38ee1e0eb3bfb84a108d17\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`action_area_outcome_indicators\` DROP FOREIGN KEY \`FK_330bc0bb47857fade96a156d0c8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`action_area_outcomes\` DROP FOREIGN KEY \`FK_2a3c1a31a5b3c076bed53e33659\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`action_area_outcomes\` DROP FOREIGN KEY \`FK_b129bf5ec7f08d753ffafdb24cd\``,
    );
    await queryRunner.query(`DROP TABLE \`action_area_outcome_indicators\``);
    await queryRunner.query(`DROP TABLE \`indicators\``);
    await queryRunner.query(`DROP TABLE \`action_area_outcomes\``);
    await queryRunner.query(`DROP TABLE \`outcomes\``);
    await queryRunner.query(`DROP TABLE \`action_areas\``);
  }
}
