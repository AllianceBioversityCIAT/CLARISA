import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingParentFieldGlobalUnits1706719632154
  implements MigrationInterface
{
  name = 'AddingParentFieldGlobalUnits1706719632154';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`global_units\` ADD \`parent_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` ADD CONSTRAINT \`FK_f90b3f8b90420da5cbe9c77bdf5\` FOREIGN KEY (\`parent_id\`) REFERENCES \`global_units\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`global_units\` DROP FOREIGN KEY \`FK_f90b3f8b90420da5cbe9c77bdf5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_units\` DROP COLUMN \`parent_id\``,
    );
  }
}
