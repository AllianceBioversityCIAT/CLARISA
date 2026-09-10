import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddW3RegistryProjectIntegration1785160738209
  implements MigrationInterface
{
  name = 'AddW3RegistryProjectIntegration1785160738209';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `project` ADD `phase` int NOT NULL DEFAULT 2025',
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `external_source` varchar(64) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `external_project_id` varchar(128) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `external_record_id` bigint NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `external_code` varchar(255) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `source_status` varchar(64) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `source_snapshot_id` int NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `source_created_at` datetime NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `source_updated_at` datetime NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `last_synced_at` datetime NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `source_center_name` text NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `source_center_acronym` varchar(255) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD `source_funder` text NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `uq_project_external_identity` ON `project` (`external_source`, `external_project_id`)',
    );
    await queryRunner.query(
      'CREATE INDEX `idx_project_external_project_id` ON `project` (`external_project_id`)',
    );

    await queryRunner.query(
      'ALTER TABLE `project_countries` ADD `allocation_percentage` decimal(5,2) NULL',
    );

    await queryRunner.query(
      'ALTER TABLE `project_mapping` ADD `source_program_code` varchar(64) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `project_mapping` ADD `source_program_name` text NULL',
    );

    await queryRunner.query(
      "CREATE TABLE `w3_registry_sync` (`id` bigint NOT NULL AUTO_INCREMENT, `status` varchar(32) NOT NULL DEFAULT 'RUNNING', `started_at` datetime NOT NULL, `finished_at` datetime NULL, `source_snapshot_id` int NULL, `expected_count` int NULL, `processed_count` int NOT NULL DEFAULT 0, `created_count` int NOT NULL DEFAULT 0, `updated_count` int NOT NULL DEFAULT 0, `warning_count` int NOT NULL DEFAULT 0, `error_message` text NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `w3_registry_project_snapshot` (`id` bigint NOT NULL AUTO_INCREMENT, `sync_id` bigint NOT NULL, `external_project_id` varchar(128) NOT NULL, `source_record_id` bigint NULL, `external_code` varchar(255) NULL, `source_snapshot_id` int NULL, `phase` int NOT NULL DEFAULT 2026, `payload` json NOT NULL, `processing_status` varchar(32) NOT NULL DEFAULT 'RECEIVED', `project_id` bigint NULL, `warnings` json NULL, `error_message` text NULL, `ingested_at` datetime NOT NULL, INDEX `idx_w3_snapshot_source_project` (`external_project_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `idx_w3_snapshot_source_project` ON `w3_registry_project_snapshot`',
    );
    await queryRunner.query('DROP TABLE `w3_registry_project_snapshot`');
    await queryRunner.query('DROP TABLE `w3_registry_sync`');

    await queryRunner.query(
      'ALTER TABLE `project_mapping` DROP COLUMN `source_program_name`',
    );
    await queryRunner.query(
      'ALTER TABLE `project_mapping` DROP COLUMN `source_program_code`',
    );
    await queryRunner.query(
      'ALTER TABLE `project_countries` DROP COLUMN `allocation_percentage`',
    );

    await queryRunner.query(
      'DROP INDEX `idx_project_external_project_id` ON `project`',
    );
    await queryRunner.query(
      'DROP INDEX `uq_project_external_identity` ON `project`',
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `source_funder`',
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `source_center_acronym`',
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `source_center_name`',
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `last_synced_at`',
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `source_updated_at`',
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `source_created_at`',
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `source_snapshot_id`',
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `source_status`',
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `external_code`',
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `external_record_id`',
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `external_project_id`',
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP COLUMN `external_source`',
    );
    await queryRunner.query('ALTER TABLE `project` DROP COLUMN `phase`');
  }
}
