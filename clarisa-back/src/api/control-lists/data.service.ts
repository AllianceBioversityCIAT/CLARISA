import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FieldRow, ListRow } from './engine/engine.service';
import { coerceValue, formatValue } from './engine/field-types';
import { LazyDb } from './engine/lazy-db';
import { ListsService } from './lists.service';

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

export class DataService {
  constructor(
    private readonly data: LazyDb,
    private readonly lists: ListsService,
    private readonly schema: () => string,
  ) {}

  private col(name: string): string {
    if (typeof name !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(name)) {
      throw new BadRequestException('Invalid field.');
    }
    return '`' + name + '`';
  }

  private table(list: ListRow): string {
    return `${this.col(this.schema())}.${this.col(list.table_name)}`;
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

  private translate(e: any): never {
    const code = e?.driverError?.code ?? e?.code ?? '';
    const msg = String(e?.message ?? '');
    if (code === 'ER_DUP_ENTRY' || /Duplicate entry/i.test(msg)) {
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
      const value = coerceValue(f.type, body?.[f.code], f.label);
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
      this.translate(e);
    }
  }

  private async byRequestId(list: ListRow, requestId: string) {
    const rows = await this.data.query(
      `SELECT \`id\` FROM ${this.table(list)} WHERE \`request_id\` = ? LIMIT 1`,
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
      if (!body || !(f.code in body)) continue;
      const value = coerceValue(f.type, body[f.code], f.label);
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
      this.translate(e);
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
