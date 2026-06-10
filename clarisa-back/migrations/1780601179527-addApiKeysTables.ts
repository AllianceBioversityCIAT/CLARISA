import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeysTables1780601179527 implements MigrationInterface {
  name = 'AddApiKeysTables1780601179527';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`api_keys\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`mis_id\` bigint NULL,
        \`name\` varchar(255) NOT NULL,
        \`key_prefix\` varchar(16) NOT NULL,
        \`key_hash\` varchar(255) NOT NULL,
        \`scopes\` json NULL,
        \`environment_id\` bigint NULL,
        \`allowed_ips\` json NULL,
        \`expires_at\` timestamp NULL,
        \`last_used_at\` timestamp NULL,
        \`usage_count\` bigint NOT NULL DEFAULT 0,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        \`created_by\` bigint NOT NULL,
        \`updated_by\` bigint NULL,
        \`modification_justification\` text NULL,
        INDEX \`idx_api_keys_key_prefix\` (\`key_prefix\`),
        INDEX \`idx_api_keys_is_active\` (\`is_active\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`,
    );

    await queryRunner.query(
      `CREATE TABLE \`api_key_usage_logs\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`api_key_id\` bigint NOT NULL,
        \`microservice_name\` varchar(255) NOT NULL,
        \`endpoint_accessed\` varchar(500) NOT NULL,
        \`http_method\` varchar(10) NULL,
        \`status_code\` int NULL,
        \`ip_address\` varchar(45) NULL,
        \`user_agent\` varchar(500) NULL,
        \`response_time_ms\` int NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`idx_usage_logs_created_at\` (\`created_at\`),
        INDEX \`idx_usage_logs_microservice\` (\`microservice_name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`,
    );

    await queryRunner.query(
      `ALTER TABLE \`api_keys\` ADD CONSTRAINT \`FK_api_keys_mis_id\` FOREIGN KEY (\`mis_id\`) REFERENCES \`mises\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`api_keys\` ADD CONSTRAINT \`FK_api_keys_environment_id\` FOREIGN KEY (\`environment_id\`) REFERENCES \`environments\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`api_key_usage_logs\` ADD CONSTRAINT \`FK_usage_logs_api_key_id\` FOREIGN KEY (\`api_key_id\`) REFERENCES \`api_keys\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`api_key_usage_logs\` DROP FOREIGN KEY \`FK_usage_logs_api_key_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`api_keys\` DROP FOREIGN KEY \`FK_api_keys_environment_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`api_keys\` DROP FOREIGN KEY \`FK_api_keys_mis_id\``,
    );
    await queryRunner.query(`DROP TABLE \`api_key_usage_logs\``);
    await queryRunner.query(`DROP TABLE \`api_keys\``);
  }
}
