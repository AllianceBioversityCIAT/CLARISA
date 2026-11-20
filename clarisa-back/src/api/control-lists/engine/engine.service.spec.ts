import {
  EngineService,
  FieldRow,
  ListRow,
  assertListTable,
  isServerSqlError,
} from './engine.service';

const engine = new EngineService(
  {} as any,
  {} as any,
  () => 'clarisa_control_lists',
  () => 120,
);

const list: ListRow = {
  id: 7,
  code: 'soil',
  name: 'Soil',
  description: null,
  owner_role_id: 3,
  table_name: 'cl_soil',
  status: 'draft',
};

const field = (over: Partial<FieldRow>): FieldRow => ({
  id: 11,
  list_id: 7,
  code: 'name',
  label: 'Name',
  type: 'text',
  column_name: 'name',
  is_required: 0,
  is_unique: 0,
  is_indexed: 0,
  relation_list_id: null,
  position: 1,
  status: 'draft',
  ...over,
});

describe('control lists · engine', () => {
  describe('isServerSqlError (what counts as "nothing changed")', () => {
    // Review 2026-11-13, defect K: every error was taken as "the structure did
    // not change"; with the client cut mid-ALTER the column was created anyway.
    it('is true for an error the server answered', () => {
      const e = {
        code: 'ER_DUP_FIELDNAME',
        errno: 1060,
        sqlState: '42S21',
        fatal: false,
      };
      expect(isServerSqlError(e)).toBe(true);
      expect(isServerSqlError({ driverError: e })).toBe(true);
      expect(
        isServerSqlError({
          code: 'ER_LOCK_WAIT_TIMEOUT',
          errno: 1205,
          sqlState: 'HY000',
        }),
      ).toBe(true);
    });

    it('is false for a lost connection, a reset socket or a client timeout', () => {
      expect(
        isServerSqlError({ code: 'PROTOCOL_CONNECTION_LOST', fatal: true }),
      ).toBe(false);
      expect(
        isServerSqlError({ code: 'ECONNRESET', errno: -54, fatal: true }),
      ).toBe(false);
      expect(isServerSqlError({ code: 'ETIMEDOUT' })).toBe(false);
      expect(isServerSqlError(new Error('socket hang up'))).toBe(false);
      expect(isServerSqlError({ errno: 2013, sqlState: '08S01' })).toBe(false);
      expect(isServerSqlError(undefined)).toBe(false);
    });
  });

  describe('compiler', () => {
    it('creates the table with audit columns, indexes and the foreign key in one statement', () => {
      const sql = engine.buildCreateTable(
        list,
        [
          field({}),
          field({
            id: 12,
            code: 'kind',
            column_name: 'kind',
            type: 'relation',
            relation_list_id: 5,
          }),
          field({ id: 13, code: 'iso', column_name: 'iso', is_unique: 1 }),
        ],
        new Map([[5, 'cl_kinds']]),
      );
      expect(sql).toMatch(/^CREATE TABLE `clarisa_control_lists`\.`cl_soil`/);
      expect(sql).toContain('`modification_justification` VARCHAR(500) NULL');
      expect(sql).toContain('UNIQUE KEY `uq_cl_7_13` (`iso`)');
      expect(sql).toContain('KEY `ix_cl_7_12` (`kind`)');
      expect(sql).toContain(
        'CONSTRAINT `fk_cl_7_12` FOREIGN KEY (`kind`) REFERENCES `clarisa_control_lists`.`cl_kinds` (`id`) ON DELETE RESTRICT',
      );
      expect(sql.match(/;/g)).toBeNull();
    });

    it('stores record request ids exactly: "AbC" is not "abc"', () => {
      // With the table's collation (case-insensitive) a bulk request whose id
      // differed only by case was answered with the other one's count.
      expect(engine.buildCreateTable(list, [field({})], new Map())).toContain(
        '`request_id` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL',
      );
    });

    it('drops the foreign key together with its column', () => {
      expect(
        engine.buildDropColumn(
          list,
          field({ id: 12, type: 'relation', column_name: 'kind' }),
        ),
      ).toBe(
        'ALTER TABLE `clarisa_control_lists`.`cl_soil` DROP FOREIGN KEY `fk_cl_7_12`, DROP COLUMN `kind`',
      );
    });

    it('refuses identifiers that are not plain lowercase names', () => {
      expect(() =>
        engine.buildRenameColumn(list, 'name', 'x`; DROP TABLE y; --'),
      ).toThrow();
      expect(() => engine.qualified('Robert')).toThrow();
    });

    it('refuses an index on long text before MySQL sees it', () => {
      expect(() =>
        engine.buildAddColumn(
          list,
          field({ type: 'long_text', is_indexed: 1 }),
        ),
      ).toThrow(/long text/);
    });
  });

  // Infrastructure, 2026-11-17: the list tables live in CLARISA's own
  // database. Only `cl_<code>` tables can ever be named by the module.
  describe("sharing CLARISA's database", () => {
    it('only ever names the table of a list, never a CLARISA table or the catalog', () => {
      for (const bad of [
        'institutions',
        'roles',
        'cl_lists',
        'cl_fields',
        'cl_schema_ops',
        'cl_',
        'clx',
      ]) {
        expect(() => assertListTable(bad)).toThrow(
          /not the table of a control list/,
        );
        expect(() => engine.qualified(bad)).toThrow();
      }
      expect(() =>
        engine.buildDropTable({ ...list, table_name: 'roles' }),
      ).toThrow();
      expect(() => assertListTable('cl_soil')).not.toThrow();
    });

    it("works with CLARISA's database name, capitals included", () => {
      const shared = new EngineService(
        {} as any,
        {} as any,
        () => 'clarisaDB',
        () => 120,
      );
      expect(shared.buildDropTable(list)).toBe(
        'DROP TABLE `clarisaDB`.`cl_soil`',
      );
      const unset = new EngineService(
        {} as any,
        {} as any,
        () => '',
        () => 120,
      );
      expect(() => unset.buildDropTable(list)).toThrow(/not configured/);
      // Before any query, so an empty DB_NAME never reaches information_schema.
      expect(() => unset.schema).toThrow(/not configured/);
      const odd = new EngineService(
        {} as any,
        {} as any,
        () => 'a`b',
        () => 120,
      );
      expect(() => odd.qualified('cl_soil')).toThrow(/not configured/);
    });
  });

  describe('buildSetRules (required, unique and filterable of a published field)', () => {
    const rules = (
      over: Partial<{
        is_required: boolean;
        is_unique: boolean;
        is_indexed: boolean;
      }>,
    ) => ({
      is_required: false,
      is_unique: false,
      is_indexed: false,
      ...over,
    });
    const T = 'ALTER TABLE `clarisa_control_lists`.`cl_soil` ';

    it('is one statement: nullability and the index swap land together', () => {
      const plan = engine.buildSetRules(
        list,
        field({ is_indexed: 1 }),
        rules({ is_required: true, is_unique: true, is_indexed: true }),
      );
      expect(plan.sql).toBe(
        T +
          'MODIFY COLUMN `name` VARCHAR(255) NOT NULL, ' +
          'ADD UNIQUE KEY `uq_cl_7_11` (`name`), DROP KEY `ix_cl_7_11`',
      );
      expect(plan.intent).toEqual({
        kind: 'set_rules',
        fieldId: 11,
        table: 'cl_soil',
        column: 'name',
        required: true,
        unique: true,
        indexed: true,
        index: 'unique',
        ix: 'ix_cl_7_11',
        uq: 'uq_cl_7_11',
      });
    });

    it('each rule alone touches only its own part', () => {
      expect(
        engine.buildSetRules(list, field({}), rules({ is_required: true })).sql,
      ).toBe(T + 'MODIFY COLUMN `name` VARCHAR(255) NOT NULL');
      expect(
        engine.buildSetRules(
          list,
          field({ is_required: 1 }),
          rules({ is_required: false }),
        ).sql,
      ).toBe(T + 'MODIFY COLUMN `name` VARCHAR(255) NULL');
      expect(
        engine.buildSetRules(list, field({}), rules({ is_indexed: true })).sql,
      ).toBe(T + 'ADD KEY `ix_cl_7_11` (`name`)');
      expect(
        engine.buildSetRules(list, field({ is_indexed: 1 }), rules({})).sql,
      ).toBe(T + 'DROP KEY `ix_cl_7_11`');
      expect(
        engine.buildSetRules(list, field({ is_unique: 1 }), rules({})).sql,
      ).toBe(T + 'DROP KEY `uq_cl_7_11`');
      expect(
        engine.buildSetRules(
          list,
          field({ is_unique: 1, is_indexed: 1 }),
          rules({ is_indexed: true }),
        ).sql,
      ).toBe(T + 'ADD KEY `ix_cl_7_11` (`name`), DROP KEY `uq_cl_7_11`');
    });

    it('carries who asked, so the catalog keeps the author once it lands', () => {
      const plan = engine.buildSetRules(
        list,
        field({}),
        rules({ is_required: true }),
        101,
      );
      expect(plan.intent).toMatchObject({ kind: 'set_rules', by: 101 });
    });

    it('nothing to change in the table gives no statement', () => {
      expect(engine.buildSetRules(list, field({}), rules({}))).toBeNull();
      // Filterable on a unique field: the unique key already serves the filter.
      expect(
        engine.buildSetRules(
          list,
          field({ is_unique: 1 }),
          rules({ is_unique: true, is_indexed: true }),
        ),
      ).toBeNull();
    });

    it('a relation never loses its index: the foreign key needs one', () => {
      const rel = (over: Partial<FieldRow>) =>
        field({
          id: 12,
          code: 'kind',
          column_name: 'kind',
          type: 'relation',
          relation_list_id: 5,
          ...over,
        });
      // Filterable off on a relation: catalog only.
      expect(
        engine.buildSetRules(list, rel({ is_indexed: 1 }), rules({})),
      ).toBeNull();
      expect(
        engine.buildSetRules(list, rel({}), rules({ is_unique: true })).sql,
      ).toBe(T + 'ADD UNIQUE KEY `uq_cl_7_12` (`kind`), DROP KEY `ix_cl_7_12`');
      const back = engine.buildSetRules(list, rel({ is_unique: 1 }), rules({}));
      expect(back.sql).toBe(
        T + 'ADD KEY `ix_cl_7_12` (`kind`), DROP KEY `uq_cl_7_12`',
      );
      expect(back.intent).toMatchObject({ index: 'plain', unique: false });
      expect(
        engine.buildSetRules(list, rel({}), rules({ is_required: true })).sql,
      ).toBe(T + 'MODIFY COLUMN `kind` BIGINT NOT NULL');
    });

    it('long text is refused before MySQL sees it', () => {
      const long = field({ type: 'long_text' });
      expect(() =>
        engine.buildSetRules(list, long, rules({ is_unique: true })),
      ).toThrow(/long text/);
      expect(() =>
        engine.buildSetRules(list, long, rules({ is_indexed: true })),
      ).toThrow(/long text/);
      expect(
        engine.buildSetRules(list, long, rules({ is_required: true })).sql,
      ).toBe(T + 'MODIFY COLUMN `name` TEXT NOT NULL');
    });
  });
});
