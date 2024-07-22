import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangingColumnNameGlossary1721250533225
  implements MigrationInterface
{
  name = 'ChangingColumnNameGlossary1721250533225';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`glossary\` CHANGE \`title\` \`term\` text CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`glossary\` CHANGE \`term\` \`title\` text CHARACTER SET "utf8mb4" COLLATE "utf8mb4_0900_ai_ci" NOT NULL`,
    );
  }
}
