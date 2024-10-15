import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllianceLevers1729007797004 implements MigrationInterface {
  name = 'AddAllianceLevers1729007797004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`levers\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`short_name\` text NULL, \`full_name\` text NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `INSERT INTO \`levers\` (\`short_name\`, \`full_name\`, \`created_by\`) VALUES ('Lever 1', 'Lever 1: Food Environments and Consumer Behavior', 4372), ('Lever 2', 'Lever 2: Multifunctional Landscapes', 4372), ('Lever 3', 'Lever 3: Climate Action', 4372), ('Lever 4', 'Lever 4: Biodiversity for Food and Agriculture', 4372), ('Lever 5', 'Lever 5: Digital Inclusion', 4372), ('Lever 6', 'Lever 6: Crops for Nutrition and Health', 4372), ('Lever 7', 'Lever 7: Gender and Inclusion', 4372), ('Lever 8', 'Lever 8: Performance, Innovation and Strategic Analysis for Impact', 4372);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`levers\``);
  }
}
