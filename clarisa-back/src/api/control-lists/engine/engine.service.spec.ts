import {
  EngineService,
  FieldRow,
  ListRow,
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
});
