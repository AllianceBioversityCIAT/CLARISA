import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedNewFieldsImpactAreaIndicator1743113089530
  implements MigrationInterface
{
  name = 'AddedNewFieldsImpactAreaIndicator1743113089530';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`impact_area_indicators\` ADD \`portfolio_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`impact_area_indicators\` ADD \`parent_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`impact_area_indicators\` ADD \`level\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`impact_area_indicators\` ADD CONSTRAINT \`FK_fbf375068e8a9ff9c3baa47463c\` FOREIGN KEY (\`parent_id\`) REFERENCES \`impact_area_indicators\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`impact_area_indicators\` ADD CONSTRAINT \`FK_3fcd5630b16d452bec77fb65521\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`portfolios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`impact_area_indicators\` DROP FOREIGN KEY \`FK_3fcd5630b16d452bec77fb65521\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`impact_area_indicators\` DROP FOREIGN KEY \`FK_fbf375068e8a9ff9c3baa47463c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`impact_area_indicators\` DROP COLUMN \`level\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`impact_area_indicators\` DROP COLUMN \`parent_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`impact_area_indicators\` DROP COLUMN \`portfolio_id\``,
    );
  }
}
