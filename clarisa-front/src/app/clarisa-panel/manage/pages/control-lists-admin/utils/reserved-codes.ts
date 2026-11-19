/**
 * Codes the back refuses, copied from `clarisa-back/src/api/control-lists/engine/field-types.ts`
 * (`RESERVED`, `SYSTEM_COLUMNS`, `RESERVED_LIST_CODES`). Keep them in step with that file: the
 * back stays the judge, this only saves a round trip and lets the suggestion avoid them.
 */

/** MySQL words and public-address query parameters: refused as a field code AND as a list code. */
const RESERVED = new Set([
  'select',
  'insert',
  'update',
  'delete',
  'from',
  'where',
  'table',
  'index',
  'key',
  'order',
  'group',
  'by',
  'join',
  'left',
  'right',
  'inner',
  'outer',
  'union',
  'create',
  'drop',
  'alter',
  'add',
  'column',
  'primary',
  'foreign',
  'references',
  'default',
  'null',
  'not',
  'and',
  'or',
  'like',
  'in',
  'is',
  'between',
  'case',
  'when',
  'then',
  'else',
  'end',
  'as',
  'on',
  'using',
  'desc',
  'asc',
  'limit',
  'offset',
  'having',
  'distinct',
  'values',
  'set',
  'int',
  'integer',
  'varchar',
  'text',
  'date',
  'datetime',
  'timestamp',
  'rank',
  'row',
  'rows',
  'lead',
  'lag',
  'window',
  'over',
  'partition',
  'show',
  'fields',
  'expand',
  'dir',
  'version'
]);

/** Columns the engine owns: refused as a field code only. */
const SYSTEM_COLUMNS = new Set([
  'id',
  'created_at',
  'updated_at',
  'is_active',
  'created_by',
  'updated_by',
  'modification_justification',
  'request_id'
]);

/** Routes and tables of the module: refused as a list code only. */
const RESERVED_LIST_CODES = new Set(['admin', 'get', 'lists', 'fields', 'schema_ops']);

export type CodeKind = 'field' | 'list';

export function isReservedCode(code: string, kind: CodeKind): boolean {
  if (RESERVED.has(code)) return true;
  return kind === 'field' ? SYSTEM_COLUMNS.has(code) : RESERVED_LIST_CODES.has(code);
}

export const reservedMessage = (code: string): string => `"${code}" is a reserved word. Choose another code.`;
