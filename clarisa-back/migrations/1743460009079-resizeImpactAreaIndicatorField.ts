import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResizeImpactAreaIndicatorField1743460009079
  implements MigrationInterface
{
  name = 'ResizeImpactAreaIndicatorField1743460009079';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`impact_area_indicators\` CHANGE COLUMN \`indicator_statement\` \`indicator_statement\` VARCHAR(200) NULL;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`impact_area_indicators\` CHANGE COLUMN \`indicator_statement\` \`indicator_statement\` VARCHAR(100) NULL;`,
    );
  }
}
