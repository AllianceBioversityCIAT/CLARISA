import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixingNullableOnCountryOffice1724776296435
  implements MigrationInterface
{
  name = 'FixingNullableOnCountryOffice1724776296435';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`country_office_requests\` CHANGE \`request_source\` \`request_source\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`country_office_requests\` CHANGE \`request_source\` \`request_source\` text CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NOT NULL`,
    );
  }
}
