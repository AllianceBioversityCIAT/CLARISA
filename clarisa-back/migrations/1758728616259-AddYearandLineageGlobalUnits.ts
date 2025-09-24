import { MigrationInterface, QueryRunner } from "typeorm";

export class AddYearandLineageGlobalUnits1758728616259 implements MigrationInterface {
    name = 'AddYearandLineageGlobalUnits1758728616259'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`global_unit_lineage\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`from_global_unit_id\` bigint NOT NULL, \`to_global_unit_id\` bigint NOT NULL, \`relation_type\` enum ('MERGE', 'SPLIT', 'SUCCESSOR', 'RENAME') NOT NULL, \`note\` text NULL, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`global_units\` ADD \`year\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`global_unit_lineage\` ADD CONSTRAINT \`FK_2ed43246e6d44248c37191ef4b2\` FOREIGN KEY (\`from_global_unit_id\`) REFERENCES \`global_units\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`global_unit_lineage\` ADD CONSTRAINT \`FK_ec1abd75ef70a979872f01cf31d\` FOREIGN KEY (\`to_global_unit_id\`) REFERENCES \`global_units\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`global_unit_lineage\` DROP FOREIGN KEY \`FK_ec1abd75ef70a979872f01cf31d\``);
        await queryRunner.query(`ALTER TABLE \`global_unit_lineage\` DROP FOREIGN KEY \`FK_2ed43246e6d44248c37191ef4b2\``);
        await queryRunner.query(`ALTER TABLE \`global_units\` DROP COLUMN \`year\``);
        await queryRunner.query(`DROP TABLE \`global_unit_lineage\``);
    }

}
