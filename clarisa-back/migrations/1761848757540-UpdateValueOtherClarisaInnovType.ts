import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateValueOtherClarisaInnovType1761848757540 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE \`innovation_types\`
            SET \`name\` = 'Other/I’m not sure/This typology does not work for my innovation'
            WHERE \`id\` = 15;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE \`innovation_types\`
            SET \`name\` = 'Other'
            WHERE \`id\` = 15;
        `);
    }

}
