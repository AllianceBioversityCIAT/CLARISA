import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The panel's documentation tables are metadata-driven: columns come from
 * hp_clarisa_endpoints.response_json. This migration adds the new
 * `portfolios` column (object_type "chips") to the Glossary endpoint
 * metadata so the panel renders each term's portfolios as chips.
 *
 * JSON_SET is additive and idempotent: it only writes the `portfolios`
 * property, preserving the rest of the JSON. down() removes that property.
 *
 * The row is admin-panel data, not something any migration seeds, and `route`
 * carries no unique index — so an `UPDATE ... WHERE route = 'api/glossary'`
 * matches zero rows **silently** if the endpoint was never registered, and the
 * deploy still looks green while the panel renders no portfolios column. The
 * statement below therefore checks what it affected and fails loudly instead.
 * Verified on production before writing this: the row exists, with properties
 * `term` and `definition`, so this guard is a safety net and not a wall.
 */
export class AddPortfoliosToGlossaryDocsMetadata1784059095324
  implements MigrationInterface
{
  name = 'AddPortfoliosToGlossaryDocsMetadata1784059095324';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(
      `UPDATE \`hp_clarisa_endpoints\`
       SET \`response_json\` = JSON_SET(
         \`response_json\`,
         '$.properties.portfolios',
         CAST('{"type": "list", "order": 2, "properties": {"id": {"type": "number", "order": 0, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}, "name": {"type": "string", "order": 1, "properties": null, "column_name": "", "object_type": "field", "show_in_table": true}, "acronym": {"type": "string", "order": 2, "properties": null, "column_name": null, "object_type": "field", "show_in_table": false}}, "column_name": "Portfolios", "object_type": "chips", "show_in_table": true}' AS JSON)
       )
       WHERE \`route\` = 'api/glossary'`,
    );

    if (Number(result?.affectedRows ?? 0) === 0) {
      throw new Error(
        "No row in hp_clarisa_endpoints has route = 'api/glossary', so the " +
          'portfolios column was not added to the panel documentation. This ' +
          'migration is metadata only and safe to re-run: register the ' +
          'endpoint row for api/glossary and run the migration again. Failing ' +
          'here on purpose — a silent no-op would leave the deploy looking ' +
          'green with the column missing.',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`hp_clarisa_endpoints\`
       SET \`response_json\` = JSON_REMOVE(\`response_json\`, '$.properties.portfolios')
       WHERE \`route\` = 'api/glossary'`,
    );
  }
}
