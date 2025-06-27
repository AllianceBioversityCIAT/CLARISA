import { MigrationInterface, QueryRunner } from "typeorm";

export class AddfieldInnovationUseLevels1751055631942 implements MigrationInterface {
    name = 'AddfieldInnovationUseLevels1751055631942'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`innovation_use_levels\` ADD \`level\` int NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`innovation_use_levels\` DROP COLUMN \`level\``);
    }

}
