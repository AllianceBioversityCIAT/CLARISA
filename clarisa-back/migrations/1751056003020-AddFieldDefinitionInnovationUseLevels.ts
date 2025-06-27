import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFieldDefinitionInnovationUseLevels1751056003020 implements MigrationInterface {
    name = 'AddFieldDefinitionInnovationUseLevels1751056003020'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`innovation_use_levels\` ADD \`definition\` text NULL AFTER \`level\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`innovation_use_levels\` DROP COLUMN \`definition\``);
    }

}
