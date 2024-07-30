import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingTestingUrlsForMicroservice1720801480512
  implements MigrationInterface
{
  name = 'AddingTestingUrlsForMicroservice1720801480512';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`microservice_monitoring_test_links\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`link\` text NOT NULL, \`cron_expression\` text NOT NULL, \`html_tag\` text NOT NULL, \`html_tag_attribute\` text NOT NULL, \`html_tag_attribute_value\` text NOT NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`is_active\` tinyint(1) NOT NULL DEFAULT 1, \`created_by\` bigint NOT NULL, \`updated_by\` bigint NULL, \`modification_justification\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE \`microservice_monitoring_test_links\``,
    );
  }
}
