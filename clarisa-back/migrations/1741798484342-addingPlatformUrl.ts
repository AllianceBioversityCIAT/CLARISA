import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingPlatformUrl1741798484342 implements MigrationInterface {
  name = 'AddingPlatformUrl1741798484342';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`partner_requests\` ADD \`platform_url\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`partner_requests\` DROP COLUMN \`platform_url\``,
    );
  }
}
