import { MigrationInterface, QueryRunner } from "typeorm";

export class AddeProjectBilateralsTables1758213344189 implements MigrationInterface {
    name = 'AddeProjectBilateralsTables1758213344189'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`project_countries\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`project_id\` bigint NOT NULL, \`country_iso_numeric\` bigint NOT NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, INDEX \`IDX_682d9c839d9cff1f4eccff3e0b\` (\`project_id\`), INDEX \`IDX_1054998b79bee6dc427e19a414\` (\`country_iso_numeric\`), UNIQUE INDEX \`uq_project_country\` (\`project_id\`, \`country_iso_numeric\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`projects\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`legacy_project_id\` bigint NULL, \`short_name\` text NOT NULL, \`full_name\` text NOT NULL, \`summary\` text NOT NULL, \`description\` text NULL, \`start_date\` timestamp NULL, \`end_date\` timestamp NULL, \`total_budget\` decimal(15,2) NOT NULL DEFAULT '0.00', \`remaining_budget\` decimal(15,2) NOT NULL DEFAULT '0.00', \`annual_budget\` decimal(15,2) NULL, \`funding_source\` text NULL, \`lead_institution_id\` bigint NULL, \`funder_institution_id\` bigint NULL, \`interim_director_review\` text NULL, \`project_results\` text NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, INDEX \`IDX_669750cecef267a48642f3451f\` (\`legacy_project_id\`), INDEX \`IDX_c5c52901f59193e752d94dd7b7\` (\`lead_institution_id\`), INDEX \`IDX_7d990a911bc20059ddd54e91bd\` (\`funder_institution_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`project_mapping\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`project_id\` bigint NOT NULL, \`global_unit_id\` bigint NOT NULL, \`allocation\` int NOT NULL, \`complementarity\` enum ('low', 'medium', 'high') NOT NULL DEFAULT 'medium', \`efficiencies\` enum ('low', 'medium', 'high') NOT NULL DEFAULT 'medium', \`comments\` text NULL, \`status\` enum ('Confirmed', 'Proposed', 'Rejected', 'Pending') NOT NULL DEFAULT 'Confirmed', \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, INDEX \`IDX_4b242cab70aceaded7e48901c9\` (\`project_id\`), INDEX \`IDX_2101d9d86c9132c70d9d433623\` (\`global_unit_id\`), UNIQUE INDEX \`uq_project_globalunit\` (\`project_id\`, \`global_unit_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`project_countries\` ADD CONSTRAINT \`FK_682d9c839d9cff1f4eccff3e0bf\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`project_countries\` ADD CONSTRAINT \`FK_1054998b79bee6dc427e19a4148\` FOREIGN KEY (\`country_iso_numeric\`) REFERENCES \`countries\`(\`iso_numeric\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`projects\` ADD CONSTRAINT \`FK_c5c52901f59193e752d94dd7b78\` FOREIGN KEY (\`lead_institution_id\`) REFERENCES \`institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`projects\` ADD CONSTRAINT \`FK_7d990a911bc20059ddd54e91bd7\` FOREIGN KEY (\`funder_institution_id\`) REFERENCES \`institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`project_mapping\` ADD CONSTRAINT \`FK_4b242cab70aceaded7e48901c9c\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`project_mapping\` ADD CONSTRAINT \`FK_2101d9d86c9132c70d9d4336230\` FOREIGN KEY (\`global_unit_id\`) REFERENCES \`global_units\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`project_mapping\` DROP FOREIGN KEY \`FK_2101d9d86c9132c70d9d4336230\``);
        await queryRunner.query(`ALTER TABLE \`project_mapping\` DROP FOREIGN KEY \`FK_4b242cab70aceaded7e48901c9c\``);
        await queryRunner.query(`ALTER TABLE \`projects\` DROP FOREIGN KEY \`FK_7d990a911bc20059ddd54e91bd7\``);
        await queryRunner.query(`ALTER TABLE \`projects\` DROP FOREIGN KEY \`FK_c5c52901f59193e752d94dd7b78\``);
        await queryRunner.query(`ALTER TABLE \`project_countries\` DROP FOREIGN KEY \`FK_1054998b79bee6dc427e19a4148\``);
        await queryRunner.query(`ALTER TABLE \`project_countries\` DROP FOREIGN KEY \`FK_682d9c839d9cff1f4eccff3e0bf\``);
        await queryRunner.query(`DROP INDEX \`uq_project_globalunit\` ON \`project_mapping\``);
        await queryRunner.query(`DROP INDEX \`IDX_2101d9d86c9132c70d9d433623\` ON \`project_mapping\``);
        await queryRunner.query(`DROP INDEX \`IDX_4b242cab70aceaded7e48901c9\` ON \`project_mapping\``);
        await queryRunner.query(`DROP TABLE \`project_mapping\``);
        await queryRunner.query(`DROP INDEX \`IDX_7d990a911bc20059ddd54e91bd\` ON \`projects\``);
        await queryRunner.query(`DROP INDEX \`IDX_c5c52901f59193e752d94dd7b7\` ON \`projects\``);
        await queryRunner.query(`DROP INDEX \`IDX_669750cecef267a48642f3451f\` ON \`projects\``);
        await queryRunner.query(`DROP TABLE \`projects\``);
        await queryRunner.query(`DROP INDEX \`uq_project_country\` ON \`project_countries\``);
        await queryRunner.query(`DROP INDEX \`IDX_1054998b79bee6dc427e19a414\` ON \`project_countries\``);
        await queryRunner.query(`DROP INDEX \`IDX_682d9c839d9cff1f4eccff3e0b\` ON \`project_countries\``);
        await queryRunner.query(`DROP TABLE \`project_countries\``);
    }

}
