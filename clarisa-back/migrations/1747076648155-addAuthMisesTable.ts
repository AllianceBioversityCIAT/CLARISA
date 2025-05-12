import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuthMisesTable1747076648155 implements MigrationInterface {
    name = 'AddAuthMisesTable1747076648155'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`mises_auth\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`mis_id\` bigint NOT NULL, \`auth_url\` text NOT NULL, \`cognito_client_id\` text NOT NULL, \`cognito_client_secret\` text NOT NULL, UNIQUE INDEX \`REL_d168856577ccc50c23514b3de4\` (\`mis_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`mises_auth\` ADD CONSTRAINT \`FK_d168856577ccc50c23514b3de4c\` FOREIGN KEY (\`mis_id\`) REFERENCES \`mises\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`mises_auth\` DROP FOREIGN KEY \`FK_d168856577ccc50c23514b3de4c\``);
        await queryRunner.query(`DROP INDEX \`REL_d168856577ccc50c23514b3de4\` ON \`mises_auth\``);
        await queryRunner.query(`DROP TABLE \`mises_auth\``);
    }

}
