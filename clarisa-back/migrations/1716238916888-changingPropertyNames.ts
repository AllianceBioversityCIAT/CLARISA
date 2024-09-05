import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangingPropertyNames1716238916888 implements MigrationInterface {
  name = 'ChangingPropertyNames1716238916888';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`sustainable_development_goal_indicators\` RENAME COLUMN \`unsd_indicator_codes\` TO \`unsd_indicator_code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`sustainable_development_goal_indicators\` RENAME COLUMN \`sdg_indicator_codes\` TO \`sdg_indicator_code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_targets\` RENAME COLUMN \`impact_areas_id\` TO \`impact_area_id\``,
    );
    await queryRunner.query(
      `RENAME TABLE \`depths_description\` TO \`depth_descriptions\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`mises\` RENAME COLUMN \`contact_point_id\` TO \`main_contact_point_id\``,
    );
    await queryRunner.query(
      `RENAME TABLE \`projected_benefits_depths\` TO \`projected_benefit_depths\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`projected_benefit_depths\` RENAME COLUMN \`projected_benefits_id\` TO \`projected_benefit_id\``,
    );
    await queryRunner.query(
      `RENAME TABLE \`projected_benefits_probabilites\` TO \`projected_benefit_probabilites\``,
    );
    await queryRunner.query(
      `RENAME TABLE \`projected_benefits_weight_description\` TO \`projected_benefit_weight_descriptions\``,
    );
    await queryRunner.query(
      `RENAME TABLE \`projected_benefits_weighting\` TO \`projected_benefit_weightings\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `RENAME TABLE \`projected_benefit_weightings\` TO \`projected_benefits_weighting\``,
    );
    await queryRunner.query(
      `RENAME TABLE \`projected_benefit_weight_descriptions\` TO \`projected_benefits_weight_description\``,
    );
    await queryRunner.query(
      `RENAME TABLE \`projected_benefit_probabilites\` TO \`projected_benefits_probabilites\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`projected_benefit_depths\` RENAME COLUMN \`projected_benefit_id\` TO \`projected_benefits_id\``,
    );
    await queryRunner.query(
      `RENAME TABLE \`projected_benefit_depths\` TO \`projected_benefits_depths\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`mises\` RENAME COLUMN \`main_contact_point_id\` TO \`contact_point_id\``,
    );
    await queryRunner.query(
      `RENAME TABLE \`depth_descriptions\` TO \`depths_description\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_targets\` RENAME COLUMN \`impact_area_id\` TO \`impact_areas_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`sustainable_development_goal_indicators\` RENAME COLUMN \`unsd_indicator_code\` TO \`unsd_indicator_codes\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`sustainable_development_goal_indicators\` RENAME COLUMN \`sdg_indicator_code\` TO \`sdg_indicator_codes\``,
    );
  }
}
