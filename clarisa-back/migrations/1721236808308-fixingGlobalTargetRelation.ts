import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixingGlobalTargetRelation1721236808308
  implements MigrationInterface
{
  name = 'FixingGlobalTargetRelation1721236808308';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`global_targets\` DROP FOREIGN KEY \`FK_a03552a3debda885b3c36f9e9bc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_targets\` ADD CONSTRAINT \`FK_408bf3f985df41f7c099c03cfa3\` FOREIGN KEY (\`impact_area_id\`) REFERENCES \`impact_areas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`global_targets\` DROP FOREIGN KEY \`FK_408bf3f985df41f7c099c03cfa3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_targets\` ADD CONSTRAINT \`FK_a03552a3debda885b3c36f9e9bc\` FOREIGN KEY (\`impact_area_id\`) REFERENCES \`impact_areas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
