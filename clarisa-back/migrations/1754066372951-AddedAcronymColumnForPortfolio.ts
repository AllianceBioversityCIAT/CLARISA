import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedAcronymColumnForPortfolio1754066372951
  implements MigrationInterface
{
  name = 'AddedAcronymColumnForPortfolio1754066372951';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`portfolios\` ADD \`acronym\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`portfolios\` DROP COLUMN \`acronym\``,
    );
  }
}
