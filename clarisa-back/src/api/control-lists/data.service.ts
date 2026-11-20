import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  FieldRow,
  LIMITS,
  ListRow,
  assertListTable,
  quoteSchema,
} from './engine/engine.service';
import { TEXT_MAX, coerceValue, formatValue } from './engine/field-types';
import { LazyDb } from './engine/lazy-db';
import { ListsService, collationKey, repeatedPair } from './lists.service';

/**
 * Records of a published list and the public read endpoint.
 *
 * Runs with the DATA user (no DDL). Every value goes as a parameter; column
 * names come from the catalog (already validated), never from the request.
 *
 * Public contract, fixed before the first list exists (review 2026-11-13 §6):
 *   GET /api/control-lists/{code}          → flat array, like native lists
 *   GET /api/control-lists/{code}/get/{id} → one object
 *   - `id` is a number, booleans are true/false, decimals are numbers, dates
 *     are `YYYY-MM-DD` and `YYYY-MM-DD HH:MM:SS` (no time-zone shift).
 *   - `is_active` is always present.
 *   - `?show=all|active|inactive` (default active), like native lists.
 *   - `?<field>=<value>` only on indexed, unique or relation fields; the value
 *     is converted to the field type, 400 when it does not fit.
 *   - `?expand=<relation>[,<relation>]` replaces the id by the related record
 *     `{ id, ...its fields, is_active }`, one level.
 */

const MAX_EXPAND = 5;
// `version` is read by CLARISA's version extractor on every route.
const CONTROL_PARAMS = new Set(['show', 'expand', 'version']);
/**
 * Row n stores `<request_id>:<n>` in `request_id` (VARCHAR(64)). No `:` in the
 * id itself, so the rows of one request are never counted as another's.
 */
const BULK_REQUEST_ID_RE = /^[A-Za-z0-9_-]{1,56}$/;
const DUP_KEY_RE =
  /^Duplicate entry '([\s\S]*)' for key '(?:[^']*\.)?uq_cl_(\d+)_(\d+)'/;

/** What makes two values of a unique field the same for the table. */
function repeatKey(f: FieldRow, v: string | number): string {
  const s = String(v);
  // The table's collation ignores case and accents.
  if (TEXT_MAX[f.type] !== undefined) return collationKey(s);
  if (f.type === 'decimal') {
    let d = s.replace('-', '').replace(/^0+(?=\d)/, '');
    if (d.includes('.')) d = d.replace(/\.?0+$/, '');
    return s.startsWith('-') && d !== '0' ? '-' + d : d;
  }
  if (f.type === 'datetime' && s.length === 16) return s + ':00';
  return s;
}

/**
 * The value a record sends for a field. Own keys only: a plain object also
 * answers `constructor`, and a code is never allowed to read what the request
 * did not send (the code itself is reserved too, see `RESERVED`).
 */
function sent(body: unknown, code: string): unknown {
  return body !== null &&
    typeof body === 'object' &&
    Object.prototype.hasOwnProperty.call(body, code)
    ? (body as Record<string, unknown>)[code]
    : undefined;
}

export class DataService {
  constructor(
    private readonly data: LazyDb,
    private readonly lists: ListsService,
    private readonly schema: () => string,
  ) {
    // ListsService cannot receive this service (it depends on it): the
    // options of a new relation field are written through this hook.
    this.lists.attachRecordsWriter?.((list, rows, userId) =>
      this.createMany(list, rows, userId),
    );
  }

  private col(name: string): string {
    if (typeof name !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(name)) {
      throw new BadRequestException('Invalid field.');
    }
    return '`' + name + '`';
  }

  private table(list: ListRow): string {
    assertListTable(list.table_name);
    return `${quoteSchema(this.schema())}.${this.col(list.table_name)}`;
  }

  private assertPublished(list: ListRow) {
    if (list.status !== 'published')
      throw new NotFoundException(`There is no list "${list.code}".`);
  }

  /** Only published fields have a column. */
  private async publishedFields(listId: number): Promise<FieldRow[]> {
    return (await this.lists.fields(listId)).filter(
      (f) => f.status === 'published',
    );
  }

  /** `?x=1&x=2` arrives as an array and `?x[y]=1` as an object: both refused. */
  private str(value: unknown, key: string): string {
    if (typeof value === 'string') return value;
    throw new BadRequestException(
      `The parameter "${key}" must appear once, with a single value.`,
    );
  }

  private row(fields: FieldRow[], r: any): Record<string, unknown> {
    const out: Record<string, unknown> = { id: Number(r.id) };
    for (const f of fields) out[f.code] = formatValue(f.type, r[f.column_name]);
    out.is_active = Number(r.is_active) === 1;
    return out;
  }

  private selectCols(fields: FieldRow[]): string {
    return [
      '`id`',
      ...fields.map((f) => this.col(f.column_name)),
      '`is_active`',
    ].join(', ');
  }

  async read(
    code: string,
    query: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const list = await this.lists.byCode(code);
    this.assertPublished(list);
    const fields = await this.publishedFields(list.id);
    const byCode = new Map(fields.map((f) => [f.code, f]));

    const where: string[] = [];
    const params: unknown[] = [];

    const show = (
      query.show === undefined ? 'active' : this.str(query.show, 'show')
    ).toLowerCase();
    if (show === 'active') where.push('`is_active` = 1');
    else if (show === 'inactive') where.push('`is_active` = 0');
    else if (show !== 'all')
      throw new BadRequestException(
        "show admits 'all', 'active' or 'inactive'.",
      );

    for (const [key, value] of Object.entries(query)) {
      if (CONTROL_PARAMS.has(key)) continue;
      const f = byCode.get(key);
      if (!f)
        throw new BadRequestException(
          `"${key}" is not a field of the list "${code}".`,
        );
      if (!f.is_indexed && !f.is_unique && f.type !== 'relation') {
        throw new BadRequestException(
          `"${key}" cannot be used as a filter: it is not a filterable field.`,
        );
      }
      const v = coerceValue(f.type, this.str(value, key), f.label);
      if (v === null) {
        where.push(`${this.col(f.column_name)} IS NULL`);
      } else {
        // A decimal compared with a string goes through DOUBLE in MySQL:
        // the cast keeps the comparison exact.
        where.push(
          f.type === 'decimal'
            ? `${this.col(f.column_name)} = CAST(? AS DECIMAL(18,4))`
            : `${this.col(f.column_name)} = ?`,
        );
        params.push(v);
      }
    }

    const expand: FieldRow[] = [];
    if (query.expand !== undefined) {
      const names = [
        ...new Set(
          this.str(query.expand, 'expand')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ];
      if (names.length > MAX_EXPAND) {
        throw new BadRequestException(
          `At most ${MAX_EXPAND} relations can be expanded in one request.`,
        );
      }
      for (const name of names) {
        const f = byCode.get(name);
        if (!f || f.type !== 'relation') {
          throw new BadRequestException(
            `"${name}" is not a relation field of "${code}".`,
          );
        }
        expand.push(f);
      }
    }

    const rows: any[] = await this.data.query(
      `SELECT ${this.selectCols(fields)} FROM ${this.table(list)}` +
        (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
        ' ORDER BY `id`',
      params,
    );
    const items = rows.map((r) => this.row(fields, r));
    for (const f of expand) await this.expandField(items, f);
    return items;
  }

  /** Replaces the id in `f` by the related record, with one query per relation. */
  private async expandField(
    items: Record<string, unknown>[],
    f: FieldRow,
  ): Promise<void> {
    const ids = [
      ...new Set(
        items
          .map((i) => i[f.code])
          .filter((v) => v !== null && v !== undefined),
      ),
    ];
    if (!ids.length) return;
    const target = await this.lists.byId(Number(f.relation_list_id));
    const targetFields = (await this.publishedFields(target.id)).filter(
      (tf) => tf.type !== 'relation',
    );
    const rows: any[] = await this.data.query(
      `SELECT ${this.selectCols(targetFields)} FROM ${this.table(target)} WHERE \`id\` IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
    const byId = new Map(
      rows.map((r) => [Number(r.id), this.row(targetFields, r)]),
    );
    for (const item of items) {
      const v = item[f.code];
      if (v !== null && v !== undefined)
        item[f.code] = byId.get(Number(v)) ?? null;
    }
  }

  async one(code: string, id: number): Promise<Record<string, unknown>> {
    const list = await this.lists.byCode(code);
    this.assertPublished(list);
    return this.oneOf(list, id);
  }

  private async oneOf(
    list: ListRow,
    id: number,
  ): Promise<Record<string, unknown>> {
    const fields = await this.publishedFields(list.id);
    const rows = await this.data.query(
      `SELECT ${this.selectCols(fields)} FROM ${this.table(list)} WHERE \`id\` = ?`,
      [id],
    );
    if (!rows.length)
      throw new NotFoundException(
        `There is no record ${id} in "${list.code}".`,
      );
    return this.row(fields, rows[0]);
  }

  /** `fields`: the published fields of the list, to name the one a repeat hit. */
  private translate(e: any, fields: FieldRow[] = []): never {
    const code = e?.driverError?.code ?? e?.code ?? '';
    const msg = String(e?.message ?? '');
    if (code === 'ER_DUP_ENTRY' || /Duplicate entry/i.test(msg)) {
      const m = DUP_KEY_RE.exec(msg);
      const f =
        m &&
        fields.find(
          (x) =>
            Number(x.list_id) === Number(m[2]) && Number(x.id) === Number(m[3]),
        );
      if (f)
        throw new ConflictException(
          `"${m[1]}" already exists in "${f.label}", which does not admit repeats.`,
        );
      throw new ConflictException(
        'A record with that value already exists in a field that does not admit repeats.',
      );
    }
    if (
      code === 'ER_NO_REFERENCED_ROW_2' ||
      /Cannot add or update a child row/i.test(msg)
    ) {
      throw new BadRequestException(
        'The related record you chose does not exist.',
      );
    }
    if (
      code === 'ER_DATA_TOO_LONG' ||
      /Data too long|Incorrect .* value|Out of range/i.test(msg)
    ) {
      throw new BadRequestException('A value does not fit its field.');
    }
    throw e;
  }

  private justification(body: Record<string, unknown>): string | null {
    const j = body?.modification_justification;
    if (j === undefined || j === null || j === '') return null;
    if (typeof j !== 'string' || j.length > 500) {
      throw new BadRequestException(
        'The justification must be text of 500 characters at most.',
      );
    }
    return j;
  }

  /**
   * New record. The same `request_id` twice gives back the same record (two
   * clicks, a browser retry), never a twin.
   */
  async create(list: ListRow, body: Record<string, unknown>, userId: number) {
    this.assertPublished(list);
    // `<id>:<n>` is how the rows of an "add several" request are stored.
    if (typeof body?.request_id === 'string' && body.request_id.includes(':'))
      throw new BadRequestException('The operation id is not valid.');
    const fields = await this.publishedFields(list.id);
    const requestId =
      typeof body?.request_id === 'string' &&
      body.request_id &&
      body.request_id.length <= 64
        ? body.request_id
        : null;
    if (requestId) {
      const existing = await this.byRequestId(list, requestId);
      if (existing) return existing;
    }

    const cols: string[] = [];
    const params: unknown[] = [];
    for (const f of fields) {
      const value = coerceValue(f.type, sent(body, f.code), f.label);
      if (value === null && f.is_required)
        throw new BadRequestException(`"${f.label}" is required.`);
      cols.push(this.col(f.column_name));
      params.push(value);
    }
    if (!cols.length)
      throw new BadRequestException('This list has no published fields yet.');
    cols.push('`created_by`', '`modification_justification`');
    params.push(userId, this.justification(body));
    if (requestId) {
      cols.push('`request_id`');
      params.push(requestId);
    }

    try {
      const r: any = await this.data.query(
        `INSERT INTO ${this.table(list)} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        params,
      );
      return this.oneOf(list, Number(r.insertId));
    } catch (e) {
      // Two identical requests at once: the loser returns the winner's record.
      if (requestId) {
        const existing = await this.byRequestId(list, requestId);
        if (existing) return existing;
      }
      this.translate(e, fields);
    }
  }

  /**
   * Several records in ONE `INSERT`: all of them or none. Same chokepoints as
   * `create` (published fields, catalog column names, `coerceValue`).
   */
  async createMany(
    list: ListRow,
    rows: Record<string, unknown>[],
    userId: number,
  ): Promise<number> {
    this.assertPublished(list);
    if (!rows.length) return 0;
    const fields = await this.publishedFields(list.id);
    if (!fields.length)
      throw new BadRequestException('This list has no published fields yet.');
    const cols = [
      ...fields.map((f) => this.col(f.column_name)),
      '`created_by`',
    ];
    const params: unknown[] = [];
    for (const body of rows) {
      for (const f of fields) {
        const value = coerceValue(f.type, sent(body, f.code), f.label);
        if (value === null && f.is_required)
          throw new BadRequestException(`"${f.label}" is required.`);
        params.push(value);
      }
      params.push(userId);
    }
    const one = `(${cols.map(() => '?').join(', ')})`;
    try {
      const r: any = await this.data.query(
        `INSERT INTO ${this.table(list)} (${cols.join(', ')}) VALUES ${rows.map(() => one).join(', ')}`,
        params,
      );
      return Number(r?.affectedRows ?? rows.length);
    } catch (e) {
      this.translate(e);
    }
  }

  /**
   * Several records from the panel in ONE `INSERT`: all of them or none. Row n
   * stores `<request_id>:<n>`, so the same request again (or two at once)
   * answers the first one's count instead of writing twins.
   */
  async createBulk(
    list: ListRow,
    body: Record<string, unknown>,
    userId: number,
  ): Promise<{ created: number }> {
    this.assertPublished(list);
    const rid = body?.request_id;
    if (rid === undefined || rid === null || rid === '')
      throw new BadRequestException(
        'The operation id is required to add several records.',
      );
    if (typeof rid !== 'string' || !BULK_REQUEST_ID_RE.test(rid))
      throw new BadRequestException('The operation id is not valid.');
    const done = await this.bulkCount(list, rid);
    if (done) return this.sameBulk(done, body.records);

    const records = body.records;
    if (
      !Array.isArray(records) ||
      records.length < 1 ||
      records.length > LIMITS.recordsPerBulk
    )
      throw new BadRequestException(
        `Send between 1 and ${LIMITS.recordsPerBulk} records.`,
      );
    const fields = await this.publishedFields(list.id);
    if (!fields.length)
      throw new BadRequestException('This list has no published fields yet.');
    const codes = new Set(fields.map((f) => f.code));
    const justification = this.justification(body);

    let bytes = 0;
    const rows = records.map((rec, i) => {
      const n = i + 1;
      if (typeof rec !== 'object' || rec === null || Array.isArray(rec))
        throw new BadRequestException(
          `Row ${n}: a record must be an object with one value per field.`,
        );
      for (const key of Object.keys(rec))
        if (!codes.has(key))
          throw new BadRequestException(
            `Row ${n}: "${key}" is not a field of this list.`,
          );
      return fields.map((f) => {
        let value: string | number | null;
        try {
          value = coerceValue(f.type, sent(rec, f.code), f.label);
        } catch (e) {
          if (e instanceof BadRequestException)
            throw new BadRequestException(`Row ${n}: ${e.message}`);
          throw e;
        }
        if (value === null && f.is_required)
          throw new BadRequestException(`Row ${n}: "${f.label}" is required.`);
        if (typeof value === 'string') {
          bytes += Buffer.byteLength(value, 'utf8');
          if (bytes > LIMITS.bulkBytes)
            throw new BadRequestException(
              `These records carry too much text for one request (the limit is ${LIMITS.bulkBytes / 1_000_000} MB). Add them in smaller groups.`,
            );
        }
        return value;
      });
    });
    this.assertNoRepeats(fields, rows);
    await this.assertNoRepeatsAsStored(fields, rows);
    await this.assertRelationsExist(fields, rows);

    const cols = [
      ...fields.map((f) => this.col(f.column_name)),
      '`created_by`',
      '`modification_justification`',
      '`request_id`',
    ];
    const params: unknown[] = [];
    rows.forEach((values, i) =>
      params.push(...values, userId, justification, `${rid}:${i + 1}`),
    );
    const one = `(${cols.map(() => '?').join(', ')})`;
    try {
      await this.data.query(
        `INSERT INTO ${this.table(list)} (${cols.join(', ')}) VALUES ${rows.map(() => one).join(', ')}`,
        params,
      );
      return { created: rows.length };
    } catch (e) {
      // Two identical requests at once: the loser answers the winner's count.
      const won = await this.bulkCount(list, rid);
      if (won) return this.sameBulk(won, records);
      this.translate(e, fields);
    }
  }

  /**
   * The answer to a bulk request whose id already wrote `written` records.
   * The same request again gets its first result. Another number of records
   * under that id is another request (a form edited after a failed attempt
   * and sent again): answering "created" would hide that none of it was
   * written (review 2026-11-20).
   */
  private sameBulk(written: number, records: unknown): { created: number } {
    if (Array.isArray(records) && records.length !== written)
      throw new ConflictException(
        'That operation id was already used for other records. Start again from the screen.',
      );
    return { created: written };
  }

  /** Records a bulk request already wrote: 0 when it never landed. */
  private async bulkCount(list: ListRow, rid: string): Promise<number> {
    const first = await this.data.query(
      `SELECT \`id\` FROM ${this.table(list)} WHERE \`request_id\` = ? COLLATE utf8mb4_bin LIMIT 1`,
      [`${rid}:1`],
    );
    if (!first.length) return 0;
    // Exact prefix: `%` or `_` in the id are not wildcards here.
    const prefix = `${rid}:`;
    const r = await this.data.query(
      `SELECT COUNT(*) AS n FROM ${this.table(list)} WHERE LEFT(\`request_id\`, CHAR_LENGTH(?)) = ? COLLATE utf8mb4_bin`,
      [prefix, prefix],
    );
    return Number(r[0].n);
  }

  /** Repeats inside the request on unique fields; empty values never repeat. */
  private assertNoRepeats(
    fields: FieldRow[],
    rows: (string | number | null)[][],
  ): void {
    fields.forEach((f, c) => {
      if (!f.is_unique) return;
      const seen = new Map<string, number>();
      rows.forEach((values, i) => {
        const v = values[c];
        if (v === null) return;
        const key = repeatKey(f, v);
        const first = seen.get(key);
        if (first !== undefined)
          throw new BadRequestException(
            `Rows ${first + 1} and ${i + 1} repeat "${rows[first][c]}" in "${f.label}", which does not admit repeats.`,
          );
        seen.set(key, i);
      });
    });
  }

  /**
   * The same check with the table's own collation, for text: it also reads
   * "ß" as "ss" or "Æ" as "AE". Without it MySQL refused the INSERT saying the
   * value "already exists", when it only repeats inside the request.
   */
  private async assertNoRepeatsAsStored(
    fields: FieldRow[],
    rows: (string | number | null)[][],
  ): Promise<void> {
    for (const [c, f] of fields.entries()) {
      if (!f.is_unique || TEXT_MAX[f.type] === undefined) continue;
      const at: number[] = [];
      const values: string[] = [];
      rows.forEach((r, i) => {
        if (r[c] === null) return;
        at.push(i);
        values.push(String(r[c]));
      });
      const pair = await repeatedPair((q, p) => this.data.query(q, p), values);
      if (pair)
        throw new BadRequestException(
          `Rows ${at[pair[0]] + 1} and ${at[pair[1]] + 1} repeat "${values[pair[0]]}" in "${f.label}", which does not admit repeats.`,
        );
    }
  }

  /** Every related id exists in its list: one query per relation field. */
  private async assertRelationsExist(
    fields: FieldRow[],
    rows: (string | number | null)[][],
  ): Promise<void> {
    for (const [c, f] of fields.entries()) {
      if (f.type !== 'relation') continue;
      const ids = [...new Set(rows.map((r) => r[c]).filter((v) => v !== null))];
      if (!ids.length) continue;
      const target = await this.lists.byId(Number(f.relation_list_id));
      const found: { id: number }[] = await this.data.query(
        `SELECT \`id\` FROM ${this.table(target)} WHERE \`id\` IN (${ids.map(() => '?').join(',')})`,
        ids,
      );
      const have = new Set(found.map((r) => Number(r.id)));
      const n = rows.findIndex((r) => r[c] !== null && !have.has(Number(r[c])));
      if (n >= 0)
        throw new BadRequestException(
          `Row ${n + 1}: there is no record ${rows[n][c]} in "${target.name}".`,
        );
    }
  }

  private async byRequestId(list: ListRow, requestId: string) {
    const rows = await this.data.query(
      `SELECT \`id\` FROM ${this.table(list)} WHERE \`request_id\` = ? COLLATE utf8mb4_bin LIMIT 1`,
      [requestId],
    );
    return rows.length ? this.oneOf(list, Number(rows[0].id)) : null;
  }

  async update(
    list: ListRow,
    id: number,
    body: Record<string, unknown>,
    userId: number,
  ) {
    this.assertPublished(list);
    const fields = await this.publishedFields(list.id);
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const f of fields) {
      const raw = sent(body, f.code);
      if (raw === undefined) continue;
      const value = coerceValue(f.type, raw, f.label);
      if (value === null && f.is_required)
        throw new BadRequestException(`"${f.label}" is required.`);
      sets.push(`${this.col(f.column_name)} = ?`);
      params.push(value);
    }
    if (body && 'is_active' in body) {
      sets.push('`is_active` = ?');
      params.push(coerceValue('boolean', body.is_active, 'is_active') ? 1 : 0);
    }
    if (!sets.length)
      throw new BadRequestException('There is nothing to change.');
    sets.push('`updated_by` = ?', '`modification_justification` = ?');
    params.push(userId, this.justification(body), id);
    let r: any;
    try {
      r = await this.data.query(
        `UPDATE ${this.table(list)} SET ${sets.join(', ')} WHERE \`id\` = ?`,
        params,
      );
    } catch (e) {
      this.translate(e, fields);
    }
    if (!Number(r?.affectedRows))
      throw new NotFoundException(
        `There is no record ${id} in "${list.code}".`,
      );
    return this.oneOf(list, id);
  }

  /** Deleting a record deactivates it, like every native list (review §5). */
  async deactivate(
    list: ListRow,
    id: number,
    body: Record<string, unknown>,
    userId: number,
  ) {
    this.assertPublished(list);
    const r: any = await this.data.query(
      `UPDATE ${this.table(list)} SET \`is_active\` = 0, \`updated_by\` = ?, \`modification_justification\` = ? WHERE \`id\` = ?`,
      [userId, this.justification(body ?? {}), id],
    );
    if (!Number(r?.affectedRows))
      throw new NotFoundException(
        `There is no record ${id} in "${list.code}".`,
      );
    return this.oneOf(list, id);
  }
}
