import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBilateralTable1759156284377 implements MigrationInterface {
    name = 'AddBilateralTable1759156284377'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`project_countries\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`project_id\` bigint NOT NULL, \`country_code\` bigint NOT NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, INDEX \`IDX_682d9c839d9cff1f4eccff3e0b\` (\`project_id\`), INDEX \`IDX_ed6e3c928fd60724862720a2c3\` (\`country_code\`), UNIQUE INDEX \`uq_project_country\` (\`project_id\`, \`country_code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`project\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`short_name\` text NOT NULL, \`full_name\` text NOT NULL, \`summary\` text NULL, \`description\` text NULL, \`start_date\` date NULL, \`end_date\` date NULL, \`total_budget\` decimal(15,2) NOT NULL DEFAULT '0.00', \`remaining\` decimal(15,2) NOT NULL DEFAULT '0.00', \`annual\` decimal(15,2) NULL, \`source_of_funding\` varchar(255) NULL, \`organization_code\` bigint NULL, \`funder_code\` bigint NULL, \`interim_director_review\` text NULL, \`project_results\` text NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, INDEX \`IDX_ee3744733328be4f972825c410\` (\`organization_code\`), INDEX \`IDX_0ef0cc4e3a164187f8c241a275\` (\`funder_code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`project_mapping\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`project_id\` bigint NOT NULL, \`program_id\` bigint NOT NULL, \`allocation\` int NOT NULL, \`complementarity\` enum ('low', 'medium', 'high') NOT NULL DEFAULT 'medium', \`efficiencies\` enum ('low', 'medium', 'high') NOT NULL DEFAULT 'medium', \`comments\` text NULL, \`status\` enum ('Confirmed', 'Proposed', 'Rejected', 'Pending') NOT NULL DEFAULT 'Confirmed', \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, INDEX \`IDX_4b242cab70aceaded7e48901c9\` (\`project_id\`), INDEX \`IDX_afba062d4e557b07d67b8710cb\` (\`program_id\`), UNIQUE INDEX \`uq_project_globalunit\` (\`project_id\`, \`program_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`project_countries\` ADD CONSTRAINT \`FK_682d9c839d9cff1f4eccff3e0bf\` FOREIGN KEY (\`project_id\`) REFERENCES \`project\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`project_countries\` ADD CONSTRAINT \`FK_ed6e3c928fd60724862720a2c30\` FOREIGN KEY (\`country_code\`) REFERENCES \`countries\`(\`iso_numeric\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`project\` ADD CONSTRAINT \`FK_ee3744733328be4f972825c4106\` FOREIGN KEY (\`organization_code\`) REFERENCES \`institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`project\` ADD CONSTRAINT \`FK_0ef0cc4e3a164187f8c241a2751\` FOREIGN KEY (\`funder_code\`) REFERENCES \`institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`project_mapping\` ADD CONSTRAINT \`FK_4b242cab70aceaded7e48901c9c\` FOREIGN KEY (\`project_id\`) REFERENCES \`project\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`project_mapping\` ADD CONSTRAINT \`FK_afba062d4e557b07d67b8710cb9\` FOREIGN KEY (\`program_id\`) REFERENCES \`cgiar_entities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`project_mapping\` DROP FOREIGN KEY \`FK_afba062d4e557b07d67b8710cb9\``);
        await queryRunner.query(`ALTER TABLE \`project_mapping\` DROP FOREIGN KEY \`FK_4b242cab70aceaded7e48901c9c\``);
        await queryRunner.query(`ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_0ef0cc4e3a164187f8c241a2751\``);
        await queryRunner.query(`ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_ee3744733328be4f972825c4106\``);
        await queryRunner.query(`ALTER TABLE \`project_countries\` DROP FOREIGN KEY \`FK_ed6e3c928fd60724862720a2c30\``);
        await queryRunner.query(`ALTER TABLE \`project_countries\` DROP FOREIGN KEY \`FK_682d9c839d9cff1f4eccff3e0bf\``);
        await queryRunner.query(`DROP INDEX \`uq_project_globalunit\` ON \`project_mapping\``);
        await queryRunner.query(`DROP INDEX \`IDX_afba062d4e557b07d67b8710cb\` ON \`project_mapping\``);
        await queryRunner.query(`DROP INDEX \`IDX_4b242cab70aceaded7e48901c9\` ON \`project_mapping\``);
        await queryRunner.query(`DROP TABLE \`project_mapping\``);
        await queryRunner.query(`DROP INDEX \`IDX_0ef0cc4e3a164187f8c241a275\` ON \`project\``);
        await queryRunner.query(`DROP INDEX \`IDX_ee3744733328be4f972825c410\` ON \`project\``);
        await queryRunner.query(`DROP TABLE \`project\``);
        await queryRunner.query(`DROP INDEX \`uq_project_country\` ON \`project_countries\``);
        await queryRunner.query(`DROP INDEX \`IDX_ed6e3c928fd60724862720a2c3\` ON \`project_countries\``);
        await queryRunner.query(`DROP INDEX \`IDX_682d9c839d9cff1f4eccff3e0b\` ON \`project_countries\``);
        await queryRunner.query(`DROP TABLE \`project_countries\``);
    }

}
