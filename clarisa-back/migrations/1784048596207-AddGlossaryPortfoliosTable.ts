import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class AddGlossaryPortfoliosTable1784048596207
  implements MigrationInterface
{
  name = 'AddGlossaryPortfoliosTable1784048596207';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'glossary_portfolios',
        engine: 'InnoDB',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'glossary_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'portfolio_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            precision: 6,
            isNullable: false,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            precision: 6,
            isNullable: true,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'is_active',
            type: 'tinyint',
            width: 1,
            isNullable: false,
            default: 1,
          },
          {
            name: 'created_by',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'updated_by',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'modification_justification',
            type: 'text',
            isNullable: true,
          },
        ],
        indices: [
          {
            name: 'idx_glossary_portfolios_glossary_id',
            columnNames: ['glossary_id'],
          },
          {
            name: 'idx_glossary_portfolios_portfolio_id',
            columnNames: ['portfolio_id'],
          },
        ],
        uniques: [
          {
            name: 'uq_glossary_portfolio',
            columnNames: ['glossary_id', 'portfolio_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('glossary_portfolios', [
      new TableForeignKey({
        name: 'fk_glossary_portfolios_glossary',
        columnNames: ['glossary_id'],
        referencedTableName: 'glossary',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
      new TableForeignKey({
        name: 'fk_glossary_portfolios_portfolio',
        columnNames: ['portfolio_id'],
        referencedTableName: 'portfolios',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    ]);

    // Backfill: every pre-existing glossary term belongs to the CGIAR
    // portfolio 2022-2024 (portfolios.id = 2), mirroring the term's is_active.
    // The FK above makes this fail loudly if portfolio 2 does not exist.
    await queryRunner.query(
      `INSERT INTO \`glossary_portfolios\` (\`glossary_id\`, \`portfolio_id\`, \`is_active\`, \`created_by\`)
       SELECT g.\`id\`, 2, g.\`is_active\`, COALESCE(g.\`created_by\`, 3043)
       FROM \`glossary\` g`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('glossary_portfolios', true);
  }
}
