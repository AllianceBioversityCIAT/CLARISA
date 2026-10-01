import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "MELIAF" leaves the Concepts module entirely (Yeck, 2026-10-01: "meliaf no
 * va, debe quedar como concepts"). The scheme becomes `concepts`, its URIs
 * lose the scheme segment (`/concepts/2374`, see `DEFAULT_SCHEME_CODE`) and
 * the fields drop the prefix:
 *
 * - `gc_concepts`: `meliaf_function` → `functions`, `meliaf_phase_primary` →
 *   `phase_primary`, `meliaf_phase_also` → `phase_also`.
 * - Controlled lists `meliaf_function` → `functions`, `meliaf_phase` → `phase`
 *   (`gc_lists.list_code` and the custom fields that point at them).
 * - Scheme `meliaf` → `concepts`: `gc_schemes.code`, title, and the scheme
 *   scope of its own list values.
 * - Permission routes `…/admin/meliaf/…` → `…/admin/concepts/…`.
 * - Stored JSON (history, proposals, releases, outbox) and release URIs carry
 *   the same keys, scheme code and URIs, so they are rewritten too.
 * - Free text that only named MELIAF ("MELIAF PPU", "Core MELIAF terms", the
 *   seeded scheme texts) loses the word.
 *
 * The module is not in production yet, so no external consumer reads the
 * old names. Idempotent: every step checks its source still exists. `down()`
 * restores the structure (columns, list codes, scheme code, routes); the
 * free-text edits are not undone, they carried no data.
 */
export class DropMeliafFromConcepts1790600500000 implements MigrationInterface {
  name = 'DropMeliafFromConcepts1790600500000';

  static readonly COLUMNS: ReadonlyArray<
    [from: string, to: string, ddl: string]
  > = [
    ['meliaf_function', 'functions', 'text NULL'],
    ['meliaf_phase_primary', 'phase_primary', 'varchar(50) NULL'],
    ['meliaf_phase_also', 'phase_also', 'text NULL'],
  ];

  static readonly LISTS: ReadonlyArray<[from: string, to: string]> = [
    ['meliaf_function', 'functions'],
    ['meliaf_phase', 'phase'],
  ];

  /** Permission of the concepts-only role (CONCEPTS_CE) and of full admins. */
  static readonly CONCEPTS_ROUTE = '/api/concepts/admin/concepts/concepts';
  static readonly FULL_ROUTE = '/api/concepts/admin';

  /**
   * The seeded lists (`CreateGlobalConcepts1790500000000.LISTS`) under the
   * codes they have after this migration — what a database holds today.
   */
  static currentLists(
    seeded: Record<string, string[]>,
  ): Record<string, string[]> {
    const renamed = new Map(DropMeliafFromConcepts1790600500000.LISTS);
    return Object.fromEntries(
      Object.entries(seeded).map(([code, values]) => [
        renamed.get(code) ?? code,
        values,
      ]),
    );
  }

  /** Plain replacements inside stored JSON text, in this order. */
  static readonly JSON_KEYS: ReadonlyArray<[from: string, to: string]> = [
    ['"meliaf_phase_primary"', '"phase_primary"'],
    ['"meliaf_phase_also"', '"phase_also"'],
    ['"meliaf_function"', '"functions"'],
    ['"meliaf_phase"', '"phase"'],
    ['/concepts/meliaf/', '/concepts/'],
    ['/admin/meliaf/', '/admin/concepts/'],
    ['"meliaf"', '"concepts"'],
    ['core-meliaf', 'core'],
    ['MELIAF ', ''],
  ];

  static readonly JSON_COLUMNS: ReadonlyArray<[table: string, column: string]> =
    [
      ['gc_history', 'changes'],
      ['gc_proposals', 'payload'],
      ['gc_releases', 'snapshot'],
      ['gc_outbox', 'payload'],
    ];

  /** Free-text columns that only named MELIAF as an owner or a title. */
  static readonly TEXT_COLUMNS: ReadonlyArray<[table: string, column: string]> =
    [
      ['gc_concepts', 'steward'],
      ['gc_collections', 'label'],
      ['gc_fields', 'label'],
      ['gc_fields', 'help'],
      ['gc_releases', 'notes'],
      ['gc_schemes', 'description'],
      ['gc_schemes', 'governance_description'],
      ['permissions', 'label'],
      ['permissions', 'description'],
    ];

  /** Tables whose `updated_at` moves on its own (ON UPDATE). */
  static readonly DATED = [
    'gc_concepts',
    'gc_schemes',
    'gc_proposals',
    'permissions',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = DropMeliafFromConcepts1790600500000;

    for (const [from, to, ddl] of cls.COLUMNS)
      await this.renameColumn(queryRunner, 'gc_concepts', from, to, ddl);

    for (const [from, to] of cls.LISTS)
      await this.renameList(queryRunner, from, to);

    await this.renameScheme(queryRunner, 'meliaf', 'concepts');
    await queryRunner.query(
      `UPDATE gc_schemes SET title = 'Concepts', updated_at = updated_at
        WHERE code = 'concepts' AND title = 'MELIAF taxonomy'`,
    );

    await this.renameRoutes(queryRunner, '/admin/meliaf/', '/admin/concepts/');
    await this.renameRoutes(queryRunner, '/admin/meliaf', '/admin/concepts');

    await queryRunner.query(
      `UPDATE gc_releases
          SET release_uri = REPLACE(release_uri, '/concepts/meliaf/', '/concepts/')
        WHERE release_uri LIKE '%/concepts/meliaf/%'`,
    );

    for (const [table, column] of cls.JSON_COLUMNS)
      for (const [from, to] of cls.JSON_KEYS)
        await this.replaceIn(queryRunner, table, column, from, to);

    // Collection codes are unique per scheme: only renamed when free.
    const taken = await queryRunner.query(
      `SELECT 1 FROM gc_collections WHERE code = 'core' LIMIT 1`,
    );
    if (!taken?.length)
      await queryRunner.query(
        `UPDATE gc_collections SET code = 'core' WHERE code = 'core-meliaf'`,
      );

    for (const [table, column] of cls.TEXT_COLUMNS)
      await this.replaceIn(queryRunner, table, column, 'MELIAF ', '');
    await this.replaceIn(
      queryRunner,
      'gc_schemes',
      'governance_description',
      ' (Build Brief, Group 4)',
      '',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cls = DropMeliafFromConcepts1790600500000;
    await this.renameRoutes(queryRunner, '/admin/concepts', '/admin/meliaf');
    await queryRunner.query(
      `UPDATE gc_schemes SET title = 'MELIAF taxonomy'
        WHERE code = 'concepts' AND title = 'Concepts'`,
    );
    await this.renameScheme(queryRunner, 'concepts', 'meliaf');
    for (const [from, to] of cls.LISTS)
      await this.renameList(queryRunner, to, from);
    for (const [from, to, ddl] of cls.COLUMNS)
      await this.renameColumn(queryRunner, 'gc_concepts', to, from, ddl);
  }

  private async hasColumn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<boolean> {
    const [{ n }] = await queryRunner.query(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    );
    return Number(n) > 0;
  }

  /** MySQL DDL commits on its own: only when the source exists and the target does not. */
  private async renameColumn(
    queryRunner: QueryRunner,
    table: string,
    from: string,
    to: string,
    ddl: string,
  ): Promise<void> {
    if (!(await this.hasColumn(queryRunner, table, from))) return;
    if (await this.hasColumn(queryRunner, table, to)) return;
    await queryRunner.query(
      `ALTER TABLE \`${table}\` CHANGE \`${from}\` \`${to}\` ${ddl}`,
    );
  }

  private async renameList(
    queryRunner: QueryRunner,
    from: string,
    to: string,
  ): Promise<void> {
    const taken = await queryRunner.query(
      `SELECT 1 FROM gc_lists WHERE list_code = ? LIMIT 1`,
      [to],
    );
    if (!taken?.length)
      await queryRunner.query(
        `UPDATE gc_lists SET list_code = ? WHERE list_code = ?`,
        [to, from],
      );
    await queryRunner.query(
      `UPDATE gc_fields SET list_code = ? WHERE list_code = ?`,
      [to, from],
    );
  }

  private async renameScheme(
    queryRunner: QueryRunner,
    from: string,
    to: string,
  ): Promise<void> {
    const taken = await queryRunner.query(
      `SELECT 1 FROM gc_schemes WHERE code = ? LIMIT 1`,
      [to],
    );
    if (taken?.length) return;
    await queryRunner.query(
      `UPDATE gc_schemes SET code = ?, updated_at = updated_at WHERE code = ?`,
      [to, from],
    );
    await queryRunner.query(`UPDATE gc_lists SET scope = ? WHERE scope = ?`, [
      to,
      from,
    ]);
  }

  private async renameRoutes(
    queryRunner: QueryRunner,
    from: string,
    to: string,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE permissions
          SET name = REPLACE(name, ?, ?), updated_at = updated_at
        WHERE name LIKE CONCAT('%/api/concepts%', ?, '%')`,
      [from, to, from],
    );
  }

  private async replaceIn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    from: string,
    to: string,
  ): Promise<void> {
    // A technical rewrite, nobody edited the row: keep its last-edit date
    // (the change feed reads it).
    const keepDate = DropMeliafFromConcepts1790600500000.DATED.includes(table)
      ? ', updated_at = updated_at'
      : '';
    await queryRunner.query(
      `UPDATE \`${table}\` SET \`${column}\` = REPLACE(\`${column}\`, ?, ?)${keepDate}
        WHERE \`${column}\` LIKE CONCAT('%', ?, '%')`,
      [from, to, from],
    );
  }
}
