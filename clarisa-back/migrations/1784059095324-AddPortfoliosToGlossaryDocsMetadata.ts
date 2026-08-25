import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The panel's documentation tables are metadata-driven: columns come from
 * hp_clarisa_endpoints.response_json. This migration adds the new
 * `portfolios` column (object_type "chips") to the Glossary endpoint
 * metadata so the panel renders each term's portfolios as chips.
 *
 * JSON_SET is additive and idempotent: it only writes the `portfolios`
 * property, preserving the rest of the JSON. down() removes that property.
 */
export class AddPortfoliosToGlossaryDocsMetadata1784059095324
  implements MigrationInterface
{
  name = 'AddPortfoliosToGlossaryDocsMetadata1784059095324';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`hp_clarisa_endpoints\`
       SET \`response_json\` = JSON_SET(
         \`response_json\`,
         '$.properties.portfolios',
         CAST('{"type": "list", "order": 2, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "", "object_type": "field", "show_in_table": true}, "acronym": {"type": "string", "order": 2, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": "Portfolios", "object_type": "chips", "show_in_table": true}' AS JSON)
       )
       WHERE \`route\` = 'api/glossary'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`hp_clarisa_endpoints\`
       SET \`response_json\` = JSON_REMOVE(\`response_json\`, '$.properties.portfolios')
       WHERE \`route\` = 'api/glossary'`,
    );
  }
}
