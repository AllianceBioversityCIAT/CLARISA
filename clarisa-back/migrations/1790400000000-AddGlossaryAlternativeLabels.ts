import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds alternative labels (synonyms, acronyms, older wording) to glossary
 * terms, so a search or an AI tool recognises "IA" as "Impact assessment".
 *
 * Asked by the MELIAF taxonomy work for the Rabat convening (Group 4 build
 * brief and capability checklist, 2026-09-24/25): the term register expects
 * `alternative_labels`, the SKOS `altLabel`.
 *
 * Nullable and additive. `GET api/glossary` keeps every key it already
 * publishes and appends `alternativeLabels`, always an array (`[]` for every
 * existing row), so PRMS and any other consumer is unaffected.
 *
 * Idempotent: in MySQL each DDL statement commits on its own, so the column is
 * guarded with `hasColumn` and a partially applied run can be repeated.
 */
export class AddGlossaryAlternativeLabels1790400000000
  implements MigrationInterface
{
  name = 'AddGlossaryAlternativeLabels1790400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('glossary', 'alternative_labels'))) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` ADD COLUMN \`alternative_labels\` text NULL AFTER \`definition\``,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('glossary', 'alternative_labels')) {
      await queryRunner.query(
        `ALTER TABLE \`glossary\` DROP COLUMN \`alternative_labels\``,
      );
    }
  }
}
