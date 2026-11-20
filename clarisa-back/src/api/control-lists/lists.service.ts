import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import {
  EngineService,
  FieldRow,
  FieldRules,
  LIMITS,
  ListRow,
  SchemaLock,
} from './engine/engine.service';
import {
  FIELD_TYPES,
  FieldType,
  TEXT_MAX,
  assertFieldCode,
  assertIndexable,
  assertListCode,
  isFieldType,
} from './engine/field-types';

/**
 * Who is asking. CLARISA has no groups: the owner of a list is a ROLE
 * (decision of 2026-11-17). A user reaches the lists owned by the roles they
 * hold; a `super` role reaches every list.
 */
export interface Actor {
  userId: number;
  roleIds: number[];
  isSuper: boolean;
}

const MAX = { name: 150, description: 500, label: 150 };

/** A field as the request describes it, already validated. */
interface FieldSpec {
  code: string;
  type: FieldType;
  label: string;
  is_required: boolean;
  is_unique: boolean;
  is_indexed: boolean;
}

/** `cl_schema_ops.request_id` is VARCHAR(64): the options step adds this suffix. */
const OPTIONS_SUFFIX = ':options';

/** What a relation created with its own options answers besides the field. */
export interface OptionsListInfo {
  id: number;
  code: string;
  name: string;
}

/** `cl_schema_ops.request_id` length. */
const REQUEST_ID_MAX = 64;

/** Writes records of a published list. Bound by DataService (it needs this service, so it cannot be injected). */
export type RecordsWriter = (
  list: ListRow,
  rows: Record<string, unknown>[],
  userId: number,
) => Promise<unknown>;

/** The collation every list table is created with (`buildCreateTable`). */
const OPTIONS_COLLATION = 'utf8mb4_0900_ai_ci';

/**
 * A first, cheap look at repeats: case and Latin accents do not count. Only
 * what the tables' collation surely reads as one value: the marks of other
 * scripts (a Devanagari vowel sign) DO tell two values apart, and stripping
 * them refused valid data (review 2026-11-20). The database has the last
 * word (`repeatedPair`).
 */
export function collationKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Asks MySQL which two of these values the list tables' collation reads as
 * one ("ß" and "ss", "Æ" and "AE", invisible characters): their positions,
 * or `null` when every value is its own.
 */
export async function repeatedPair(
  run: (sql: string, params: unknown[]) => Promise<any[]>,
  values: string[],
): Promise<[number, number] | null> {
  if (values.length < 2) return null;
  const rows = await run(
    `SELECT MIN(t.i) AS a, MAX(t.i) AS b
       FROM (${values.map(() => 'SELECT ? AS v, ? AS i').join(' UNION ALL ')}) t
      GROUP BY CONVERT(t.v USING utf8mb4) COLLATE ${OPTIONS_COLLATION}
     HAVING COUNT(*) > 1
      ORDER BY a
      LIMIT 1`,
    values.flatMap((v, i) => [v, i]),
  );
  return rows.length ? [Number(rows[0].a), Number(rows[0].b)] : null;
}

function text(
  value: unknown,
  field: string,
  max: number,
  required = true,
): string | null {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw new BadRequestException(`${field} is required.`);
    return null;
  }
  if (typeof value !== 'string')
    throw new BadRequestException(`${field} must be text.`);
  const clean = value.trim();
  if (clean.length > max)
    throw new BadRequestException(`${field} admits ${max} characters at most.`);
  return clean;
}

function bool(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 'true';
}

/** "1 record" / "7 records": a count the way a person reads it. */
function count(n: number, one: string): string {
  return `${n} ${n === 1 ? one : one + 's'}`;
}

/** A rule in a request: yes, no, or not named (`undefined`). Anything else is refused, never read as "no". */
function flag(v: unknown, name: string): boolean | undefined {
  if (v === undefined) return undefined;
  if (v === true || v === 1 || v === '1' || v === 'true') return true;
  if (v === false || v === 0 || v === '0' || v === 'false') return false;
  throw new BadRequestException(`${name} must be true or false.`);
}

/**
 * The catalog: create lists, design their fields, publish and delete them.
 * Every change runs inside `withSchemaLock` and starts by settling what its
 * list left open, so checks, DDL and catalog never interleave with another
 * change (review 2026-11-13 §8, conditions 1 and 2).
 */
export class ListsService {
  constructor(
    private readonly main: DataSource,
    private readonly engine: EngineService,
  ) {}

  // ─────────────────────────────── reading ───────────────────────────────

  async all(actor: Actor): Promise<ListRow[]> {
    if (actor.isSuper)
      return this.main.query('SELECT * FROM cl_lists ORDER BY name');
    if (!actor.roleIds.length) return [];
    return this.main.query(
      `SELECT * FROM cl_lists WHERE owner_role_id IN (${actor.roleIds.map(() => '?').join(',')}) ORDER BY name`,
      actor.roleIds,
    );
  }

  /** A list the actor owns. Someone else's list answers 404, not 403. */
  async owned(id: number, actor: Actor): Promise<ListRow> {
    const list = await this.find(id);
    this.assertOwner(list, actor);
    return list;
  }

  /** Someone else's list answers word for word like one that does not exist. */
  async ownedByCode(code: string, actor: Actor): Promise<ListRow> {
    const list = await this.byCode(code);
    try {
      this.assertOwner(list, actor);
    } catch {
      throw new NotFoundException(`There is no list "${code}".`);
    }
    return list;
  }

  private assertOwner(list: ListRow, actor: Actor): void {
    if (actor.isSuper) return;
    if (!actor.roleIds.includes(Number(list.owner_role_id))) {
      throw new NotFoundException('That list does not exist.');
    }
  }

  private async find(id: number): Promise<ListRow> {
    const r = await this.main.query('SELECT * FROM cl_lists WHERE id = ?', [
      id,
    ]);
    if (!r.length) throw new NotFoundException('That list does not exist.');
    return r[0];
  }

  async byCode(code: string): Promise<ListRow> {
    if (typeof code !== 'string')
      throw new NotFoundException('That list does not exist.');
    const r = await this.main.query('SELECT * FROM cl_lists WHERE code = ?', [
      code,
    ]);
    if (!r.length) throw new NotFoundException(`There is no list "${code}".`);
    return r[0];
  }

  /** Public directory: published lists only, without saying whose they are. */
  async publicDirectory() {
    const rows: ListRow[] = await this.main.query(
      "SELECT code, name, description FROM cl_lists WHERE status = 'published' ORDER BY name",
    );
    return rows.map((l) => ({
      code: l.code,
      name: l.name,
      description: l.description,
      endpoint: `/api/control-lists/${l.code}`,
    }));
  }

  async byId(id: number): Promise<ListRow> {
    return this.find(id);
  }

  async fields(listId: number): Promise<FieldRow[]> {
    return this.main.query(
      'SELECT * FROM cl_fields WHERE list_id = ? ORDER BY position, id',
      [listId],
    );
  }

  private async fieldRaw(id: number): Promise<FieldRow> {
    const r = await this.main.query('SELECT * FROM cl_fields WHERE id = ?', [
      id,
    ]);
    if (!r.length) throw new NotFoundException('That field does not exist.');
    return r[0];
  }

  /** A field of a list the actor owns, with its list. */
  private async ownedField(
    id: number,
    actor: Actor,
  ): Promise<{ f: FieldRow; list: ListRow }> {
    const f = await this.fieldRaw(id);
    const list = await this.find(f.list_id);
    try {
      this.assertOwner(list, actor);
    } catch {
      throw new NotFoundException('That field does not exist.');
    }
    return { f, list };
  }

  /**
   * Settles what the list left open, THEN reads it. Reading first used the
   * state from before the settle: a field the settle had just published was
   * deleted from the catalog only, leaving its column orphaned (found by the
   * lost-connection e2e test).
   */
  private async settledList(
    lock: SchemaLock,
    listId: number,
    actor: Actor,
  ): Promise<ListRow> {
    const pre = await this.owned(listId, actor);
    await this.engine.settleList(lock, pre.id);
    return this.owned(listId, actor);
  }

  private async settledField(
    lock: SchemaLock,
    fieldId: number,
    actor: Actor,
  ): Promise<{ f: FieldRow; list: ListRow }> {
    const pre = await this.ownedField(fieldId, actor);
    await this.engine.settleList(lock, pre.list.id);
    return this.ownedField(fieldId, actor);
  }

  async detail(id: number, actor: Actor) {
    const list = await this.owned(id, actor);
    const fields = await this.fields(id);
    const targets = new Map<number, ListRow>();
    for (const f of fields) {
      if (f.relation_list_id && !targets.has(Number(f.relation_list_id))) {
        targets.set(
          Number(f.relation_list_id),
          await this.find(f.relation_list_id),
        );
      }
    }
    const open = await this.main.query(
      "SELECT COUNT(*) AS n FROM cl_schema_ops WHERE list_id = ? AND status = 'pending'",
      [id],
    );
    return {
      ...list,
      pending_changes: Number(open[0].n),
      rows:
        list.status === 'published'
          ? await this.engine.countRows(list.table_name)
          : 0,
      fields: fields.map((f) => ({
        ...f,
        type_label: FIELD_TYPES[f.type]?.label ?? f.type,
        relation_name: f.relation_list_id
          ? targets.get(Number(f.relation_list_id))?.name
          : null,
        relation_code: f.relation_list_id
          ? targets.get(Number(f.relation_list_id))?.code
          : null,
      })),
    };
  }

  async ops(actor: Actor) {
    const owners = actor.isSuper
      ? ''
      : `WHERE l.owner_role_id IN (${actor.roleIds.map(() => '?').join(',') || 'NULL'})`;
    return this.main.query(
      `SELECT o.id, o.kind, o.status, o.request_id, o.list_id, LEFT(o.sql_text, 400) AS sql_text,
              o.error_text, o.started_at, o.finished_at
         FROM cl_schema_ops o
         JOIN cl_lists l ON l.id = o.list_id
         ${owners}
        ORDER BY o.id DESC LIMIT 50`,
      actor.isSuper ? [] : actor.roleIds,
    );
  }

  // ─────────────────────────────── writing ───────────────────────────────

  async createList(
    dto: {
      code?: unknown;
      name?: unknown;
      description?: unknown;
      owner_role_id?: unknown;
    },
    actor: Actor,
  ): Promise<ListRow> {
    assertListCode(dto.code);
    const code = dto.code;
    const name = text(dto.name, 'The list name', MAX.name);
    const description = text(
      dto.description,
      'The description',
      MAX.description,
      false,
    );
    const owner = await this.resolveOwner(dto.owner_role_id, actor);

    return this.engine.withSchemaLock((lock) =>
      this.createListIn(lock, { code, name, description, owner }, actor),
    );
  }

  /** The body of `createList`, for a caller that already holds the schema lock. */
  private async createListIn(
    lock: SchemaLock,
    l: {
      code: string;
      name: string | null;
      description: string | null;
      owner: number;
    },
    actor: Actor,
  ): Promise<ListRow> {
    const { code, name, description, owner } = l;
    const count = await this.main.query(
      'SELECT COUNT(*) AS n FROM cl_lists WHERE owner_role_id = ?',
      [owner],
    );
    if (Number(count[0].n) >= LIMITS.listsPerOwner) {
      throw new BadRequestException(
        `That role already owns ${LIMITS.listsPerOwner} lists, the maximum. Delete one it no longer uses first.`,
      );
    }
    const dup = await this.main.query(
      'SELECT id FROM cl_lists WHERE code = ?',
      [code],
    );
    if (dup.length) {
      throw new BadRequestException(
        `A list with code "${code}" already exists. The code is the public address and is unique in CLARISA.`,
      );
    }
    await this.assertTableFree(`cl_${code}`, lock);
    await this.main.query(
      `INSERT INTO cl_lists (code, name, description, owner_role_id, table_name, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
      [code, name, description, owner, `cl_${code}`, actor.userId],
    );
    return this.byCode(code);
  }

  /**
   * Name and description of a list. Catalog only: no DDL, so no schema lock
   * and no `cl_schema_ops` row. The same request twice leaves the same row.
   */
  async updateList(
    id: number,
    dto: Record<string, unknown>,
    actor: Actor,
  ): Promise<ListRow> {
    await this.owned(id, actor);
    if ('code' in dto || 'owner_role_id' in dto)
      throw new BadRequestException(
        'The code and the owner role of a list cannot be changed.',
      );
    const sets: string[] = [];
    const params: unknown[] = [];
    if ('name' in dto) {
      sets.push('name = ?');
      params.push(text(dto.name, 'The list name', MAX.name));
    }
    if ('description' in dto) {
      sets.push('description = ?');
      params.push(
        text(dto.description, 'The description', MAX.description, false),
      );
    }
    if (!sets.length)
      throw new BadRequestException('There is nothing to change.');
    await this.main.query(
      `UPDATE cl_lists SET ${sets.join(', ')}, updated_by = ? WHERE id = ?`,
      [...params, actor.userId, id],
    );
    return this.find(id);
  }

  /**
   * The lists share CLARISA's database: a table that already exists with the
   * list's name was not made by this list, so it is never adopted (a later
   * delete would drop it). Checked again right before publishing.
   */
  private async assertTableFree(table: string, lock: SchemaLock) {
    if (await this.engine.tableExists(table, lock.qr)) {
      throw new ConflictException(
        `The database already has a table named "${table}". Choose another list code.`,
      );
    }
  }

  /** The owner role: one the actor holds (any active role for a super user). */
  private async resolveOwner(raw: unknown, actor: Actor): Promise<number> {
    if (raw === undefined || raw === null || raw === '') {
      if (actor.roleIds.length === 1) return actor.roleIds[0];
      throw new BadRequestException('Choose the role that will own the list.');
    }
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0)
      throw new BadRequestException('The owner role is not valid.');
    if (actor.roleIds.includes(id)) return id;
    if (actor.isSuper) {
      const r = await this.main.query(
        'SELECT id FROM roles WHERE id = ? AND is_active = 1',
        [id],
      );
      if (r.length) return id;
    }
    throw new BadRequestException(
      'You can only give a list to a role you hold.',
    );
  }

  async addField(
    listId: number,
    dto: Record<string, unknown>,
    actor: Actor,
    requestId?: string,
  ): Promise<FieldRow & { options_list?: OptionsListInfo }> {
    assertFieldCode(dto.code);
    const code = dto.code;
    if (!isFieldType(dto.type))
      throw new BadRequestException('Unknown field type.');
    const type: FieldType = dto.type;
    const label = text(dto.label, 'The field label', MAX.label, false) ?? code;
    const spec: FieldSpec = {
      code,
      type,
      label,
      is_required: bool(dto.is_required),
      is_unique: bool(dto.is_unique),
      is_indexed: bool(dto.is_indexed),
    };
    assertIndexable({ type, ...spec });

    const hasOptions =
      dto.options_list !== undefined && dto.options_list !== null;
    if (hasOptions) {
      if (type !== 'relation')
        throw new BadRequestException(
          'A list of options only goes with a relation field.',
        );
      if (
        dto.relation_list_id !== undefined &&
        dto.relation_list_id !== null &&
        dto.relation_list_id !== ''
      )
        throw new BadRequestException(
          'Choose an existing list or write new options, not both.',
        );
      return this.addFieldWithOptions(
        listId,
        spec,
        dto.options_list,
        actor,
        requestId,
      );
    }

    return this.engine.withSchemaLock((lock) =>
      this.addFieldIn(
        lock,
        listId,
        spec,
        dto.relation_list_id,
        actor,
        requestId,
      ),
    );
  }

  /**
   * The body of `addField`, for a caller that already holds the schema lock.
   * `relationListId` is the raw request value; it is only read for relations.
   */
  private async addFieldIn(
    lock: SchemaLock,
    listId: number,
    spec: FieldSpec,
    relationListId: unknown,
    actor: Actor,
    requestId?: string,
  ): Promise<FieldRow> {
    const { code, type, label } = spec;
    const list = await this.settledList(lock, listId, actor);

    // Only a relation field stores a target: a text field with someone
    // else's list id would otherwise block deleting that list.
    let relTable: string | undefined;
    let relationId: number | null = null;
    await this.checkFieldFits(lock, list, spec, async () => {
      if (type === 'relation') {
        const target = await this.assertRelationAllowed(list, relationListId);
        relTable = target.table_name;
        relationId = target.id;
      }
    });

    const pos = await this.main.query(
      'SELECT COALESCE(MAX(position), 0) + 1 AS p FROM cl_fields WHERE list_id = ?',
      [listId],
    );
    // Born as draft: it becomes published only when its column exists.
    const ins: any = await this.main.query(
      `INSERT INTO cl_fields (list_id, code, label, type, column_name, is_required, is_unique, is_indexed,
                              relation_list_id, position, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [
        listId,
        code,
        label,
        type,
        code,
        spec.is_required ? 1 : 0,
        spec.is_unique ? 1 : 0,
        spec.is_indexed ? 1 : 0,
        relationId,
        Number(pos[0].p),
        actor.userId,
      ],
    );
    const fieldId = Number(ins.insertId);

    if (list.status === 'published') {
      const f = await this.fieldRaw(fieldId);
      try {
        await this.engine.runDdl(lock, {
          kind: 'publish_field',
          sql: this.engine.buildAddColumn(list, f, relTable),
          listId,
          requestId,
          userId: actor.userId,
          intent: {
            kind: 'publish_field',
            fieldId,
            table: list.table_name,
            column: f.column_name,
          },
        });
      } catch (e) {
        // Undone ONLY when the database surely did not change. Otherwise the
        // field stays as draft with its operation open, and the settle step
        // decides from the real structure (defect D: deleting it here left
        // a NOT NULL orphan column that broke every insert).
        if (e?.schemaUnchanged)
          await this.main.query('DELETE FROM cl_fields WHERE id = ?', [
            fieldId,
          ]);
        throw e;
      }
    }
    return this.fieldRaw(fieldId);
  }

  /**
   * Everything that can refuse a new field of `list`, before anything is
   * written. `relationCheck` runs where the relation target used to be
   * checked, so the order of the refusals is the one this method always had.
   */
  private async checkFieldFits(
    lock: SchemaLock,
    list: ListRow,
    spec: FieldSpec,
    relationCheck?: () => Promise<void>,
  ): Promise<void> {
    const existing = await this.fields(list.id);
    if (existing.length >= LIMITS.fieldsPerList) {
      throw new BadRequestException(
        `This list already has ${LIMITS.fieldsPerList} fields, the maximum.`,
      );
    }
    const indexed = existing.filter(
      (f) => f.is_unique || f.is_indexed || f.type === 'relation',
    ).length;
    if (
      (spec.is_unique || spec.is_indexed || spec.type === 'relation') &&
      indexed >= LIMITS.indexesPerList
    ) {
      throw new BadRequestException(
        `This list already has ${LIMITS.indexesPerList} filterable or unique fields, the maximum.`,
      );
    }
    if (existing.some((f) => f.code === spec.code)) {
      throw new BadRequestException(
        `The field "${spec.code}" already exists in this list.`,
      );
    }
    if (relationCheck) await relationCheck();

    if (list.status === 'published' && spec.is_required) {
      const rows = await this.engine.countRows(list.table_name, lock.qr);
      if (rows > 0) {
        throw new BadRequestException(
          `The list already has ${count(rows, 'record')}. A new field cannot start as required: create it optional and fill the data first.`,
        );
      }
    }
  }

  // ───────────────────── a relation with its own options ─────────────────────

  /** Bound once by `DataService`, which depends on this service. */
  private writeRecords?: RecordsWriter;
  attachRecordsWriter(fn: RecordsWriter): void {
    this.writeRecords = fn;
  }

  /** The options list of the request, validated: nothing is written yet. */
  private parseOptionsList(raw: unknown): {
    code: string;
    name: string;
    options: string[];
  } {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
      throw new BadRequestException(
        'The options list must have a code, a name and its options.',
      );
    const o = raw as Record<string, unknown>;
    assertListCode(o.code);
    const name = text(
      o.name,
      'The name of the options list',
      MAX.name,
    ) as string;
    if (!Array.isArray(o.options) || o.options.length === 0)
      throw new BadRequestException('Write at least one option.');
    if (o.options.length > LIMITS.optionsInline)
      throw new BadRequestException(
        `A field can start with ${LIMITS.optionsInline} options at most; add the rest in the list afterwards.`,
      );
    const seen = new Set<string>();
    const options: string[] = [];
    for (const item of o.options) {
      if (typeof item !== 'string')
        throw new BadRequestException('Every option must be text.');
      const v = item.trim();
      if (!v) throw new BadRequestException('An option is empty.');
      if (v.length > TEXT_MAX.text)
        throw new BadRequestException(
          `The option "${v.slice(0, 30)}…" admits ${TEXT_MAX.text} characters at most.`,
        );
      // The table's collation treats "Café" and "cafe" as one value and the
      // field is unique: the insert would fail halfway otherwise.
      const key = collationKey(v);
      if (seen.has(key))
        throw new BadRequestException(`The option "${v}" is repeated.`);
      seen.add(key);
      options.push(v);
    }
    return { code: o.code, name, options };
  }

  /**
   * `collationKey` covers case and accents; the database also reads "ß" as
   * "ss", "Æ" as "AE" and ignores invisible characters. The table's own
   * collation is asked here, so the insert of the options cannot fail on a
   * repeat after the list is already published (it would stay empty).
   */
  private async assertOptionsDistinct(
    lock: SchemaLock,
    options: string[],
  ): Promise<void> {
    const pair = await repeatedPair((q, p) => lock.qr.query(q, p), options);
    if (pair) {
      throw new BadRequestException(
        `The options "${options[pair[0]]}" and "${options[pair[1]]}" read as the same value. Change one of them.`,
      );
    }
  }

  /**
   * A relation field and the list it points to, created together under ONE
   * schema lock: options list → its `name` field → publish → records → the
   * relation on the parent. Each step can be repeated with the same
   * `request_id`: what is already done is recognised and skipped, so a failure
   * in the middle is finished by retrying, never by cleaning up by hand.
   */
  private async addFieldWithOptions(
    listId: number,
    spec: FieldSpec,
    rawOptions: unknown,
    actor: Actor,
    requestId?: string,
  ): Promise<FieldRow & { options_list: OptionsListInfo }> {
    const opt = this.parseOptionsList(rawOptions);
    if (
      requestId &&
      requestId.length + OPTIONS_SUFFIX.length > REQUEST_ID_MAX
    ) {
      throw new BadRequestException(
        `The operation id admits ${REQUEST_ID_MAX - OPTIONS_SUFFIX.length} characters at most when the field brings its own options.`,
      );
    }
    const rid = requestId ?? randomUUID();
    const optionsRid = `${rid}${OPTIONS_SUFFIX}`;

    return this.engine.withSchemaLock(async (lock) => {
      const parent = await this.settledList(lock, listId, actor);
      await this.assertOptionsDistinct(lock, opt.options);

      // a. A previous attempt of this same request already made the list.
      let options: ListRow | null = null;
      const prev = await this.main.query(
        'SELECT list_id FROM cl_schema_ops WHERE request_id = ?',
        [optionsRid],
      );
      if (prev.length && prev[0].list_id) {
        const found = await this.main.query(
          'SELECT * FROM cl_lists WHERE id = ?',
          [prev[0].list_id],
        );
        if (found.length) {
          const l: ListRow = found[0];
          // The request id is chosen by the client: it only resumes a list
          // that is what this request would have created.
          if (
            l.code !== opt.code ||
            Number(l.owner_role_id) !== Number(parent.owner_role_id)
          ) {
            throw new ConflictException(
              'That operation id was already used for a different change. Start again from the screen.',
            );
          }
          await this.engine.settleList(lock, l.id);
          options = (await this.find(l.id)) as ListRow;
        }
      }

      // b. Otherwise the parent is checked FIRST, so a request that is going
      // to fail on it creates nothing.
      let createdNow = false;
      if (!options) {
        await this.checkFieldFits(lock, parent, spec);
        const created = await this.createListIn(
          lock,
          {
            code: opt.code,
            name: opt.name,
            description:
              `Options of the field "${spec.label}" of "${parent.name}".`.slice(
                0,
                MAX.description,
              ),
            owner: Number(parent.owner_role_id),
          },
          actor,
        );
        try {
          await this.addFieldIn(
            lock,
            created.id,
            {
              code: 'name',
              type: 'text',
              label: 'Name',
              is_required: true,
              is_unique: true,
              is_indexed: false,
            },
            undefined,
            actor,
          );
        } catch (e) {
          // No table exists yet: only this request's catalog rows to remove.
          await this.main.query('DELETE FROM cl_fields WHERE list_id = ?', [
            created.id,
          ]);
          await this.main.query('DELETE FROM cl_lists WHERE id = ?', [
            created.id,
          ]);
          throw e;
        }
        options = created;
        createdNow = true;
      }

      // c. Real table.
      if (options.status !== 'published') {
        try {
          await this.publishIn(lock, options.id, actor, optionsRid);
        } catch (e) {
          // Refused before its operation was recorded: no retry could find
          // this draft again, and no table was made, so its rows go.
          const logged = await this.main.query(
            'SELECT id FROM cl_schema_ops WHERE request_id = ?',
            [optionsRid],
          );
          if (createdNow && !logged.length) {
            await this.main.query('DELETE FROM cl_fields WHERE list_id = ?', [
              options.id,
            ]);
            await this.main.query('DELETE FROM cl_lists WHERE id = ?', [
              options.id,
            ]);
          }
          throw e;
        }
        options = await this.find(options.id);
      }

      // d. Its records, once.
      if ((await this.engine.countRows(options.table_name, lock.qr)) === 0) {
        if (!this.writeRecords)
          throw new Error('The records writer is not attached.');
        await this.writeRecords(
          options,
          opt.options.map((name) => ({ name })),
          actor.userId,
        );
      }

      // e. The relation on the parent (a repeat finds it already there).
      const mine = (await this.fields(parent.id)).find(
        (f) =>
          f.code === spec.code &&
          Number(f.relation_list_id) === Number(options.id),
      );
      const field =
        mine ??
        (await this.addFieldIn(lock, parent.id, spec, options.id, actor, rid));
      return {
        ...field,
        options_list: {
          id: Number(options.id),
          code: options.code,
          name: options.name,
        },
      };
    });
  }

  /** The target must exist, belong to the SAME owner role and be published. */
  private async assertRelationAllowed(
    list: ListRow,
    targetId: unknown,
  ): Promise<ListRow> {
    const id = Number(targetId);
    if (!targetId || !Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Choose the list this field relates to.');
    }
    const r = await this.main.query('SELECT * FROM cl_lists WHERE id = ?', [
      id,
    ]);
    const target: ListRow | undefined = r[0];
    if (
      !target ||
      Number(target.owner_role_id) !== Number(list.owner_role_id)
    ) {
      throw new BadRequestException(
        'The list chosen for the relation is not available. A list can only relate to lists of the same owner role.',
      );
    }
    if (target.status !== 'published') {
      throw new BadRequestException(
        `The list "${target.name}" is still a draft. Publish it before relating to it.`,
      );
    }
    return target;
  }

  /** What a change would cost, shown BEFORE running it. */
  async impact(
    fieldId: number,
    action: 'delete' | 'type',
    actor: Actor,
    newType?: unknown,
  ) {
    const { f, list } = await this.ownedField(fieldId, actor);
    if (list.status !== 'published' || f.status !== 'published') {
      return {
        rows: 0,
        affected: 0,
        message: 'The field is not published yet: no data can be lost.',
      };
    }
    const rows = await this.engine.countRows(list.table_name);
    if (action === 'delete') {
      const withData = await this.engine.countNotNull(
        list.table_name,
        f.column_name,
      );
      return {
        rows,
        affected: withData,
        message:
          (withData
            ? `The field "${f.label}" is deleted with the values of ${count(withData, 'record')}. This cannot be undone.`
            : `The field "${f.label}" is deleted. It holds no data.`) +
          ' Applications reading this list stop receiving it.',
      };
    }
    if (!isFieldType(newType))
      throw new BadRequestException('Unknown field type.');
    const affected = await this.engine.retypeImpact(
      list.table_name,
      f.column_name,
      f.type,
      newType,
    );
    return {
      rows,
      affected,
      message: this.retypeMessage(f, newType, affected),
    };
  }

  private retypeMessage(f: FieldRow, to: FieldType, affected: number): string {
    return affected
      ? `Changing "${f.label}" to ${FIELD_TYPES[to].label} changes or does not fit ${count(affected, 'record')}. Confirm with that number to go ahead.`
      : `"${f.label}" changes to ${FIELD_TYPES[to].label}. No stored value changes.`;
  }

  async renameField(
    fieldId: number,
    dto: Record<string, unknown>,
    actor: Actor,
    requestId?: string,
  ) {
    // Everything is validated before anything is written.
    const label =
      dto.label !== undefined
        ? text(dto.label, 'The field label', MAX.label)
        : null;
    const newCode =
      dto.code !== undefined && dto.code !== null && dto.code !== ''
        ? dto.code
        : null;
    if (newCode !== null) assertFieldCode(newCode);

    return this.engine.withSchemaLock(async (lock) => {
      const { f, list } = await this.settledField(lock, fieldId, actor);

      if (newCode !== null && newCode !== f.code) {
        const dup = await this.main.query(
          'SELECT id FROM cl_fields WHERE list_id = ? AND code = ? AND id <> ?',
          [f.list_id, newCode, fieldId],
        );
        if (dup.length)
          throw new BadRequestException(
            `There is already a field with code "${newCode}".`,
          );
        if (list.status === 'published' && f.status === 'published') {
          await this.engine.runDdl(lock, {
            kind: 'rename_field',
            sql: this.engine.buildRenameColumn(
              list,
              f.column_name,
              newCode as string,
            ),
            listId: list.id,
            requestId,
            userId: actor.userId,
            intent: {
              kind: 'rename_field',
              fieldId,
              table: list.table_name,
              from: f.column_name,
              to: newCode as string,
            },
          });
        } else {
          await this.main.query(
            'UPDATE cl_fields SET code = ?, column_name = ? WHERE id = ?',
            [newCode, newCode, fieldId],
          );
        }
      }
      if (label !== null) {
        await this.main.query(
          'UPDATE cl_fields SET label = ?, updated_by = ? WHERE id = ?',
          [label, actor.userId, fieldId],
        );
      }
      return this.fieldRaw(fieldId);
    });
  }

  /**
   * A published field changes type only after counting the records whose
   * value would change; with any, the caller must confirm that exact number
   * (review 2026-11-13 §8, condition 4).
   */
  async changeType(
    fieldId: number,
    type: unknown,
    actor: Actor,
    confirmAffected?: unknown,
    requestId?: string,
  ) {
    if (!isFieldType(type))
      throw new BadRequestException('Unknown field type.');
    return this.engine.withSchemaLock(async (lock) => {
      const { f, list } = await this.settledField(lock, fieldId, actor);
      if (f.type === 'relation' || type === 'relation') {
        throw new BadRequestException(
          'A relation field does not change type: delete it and create the one you need.',
        );
      }
      if (f.type === type) return f;
      assertIndexable({
        type,
        is_unique: f.is_unique,
        is_indexed: f.is_indexed,
        label: f.label,
      });

      if (list.status === 'published' && f.status === 'published') {
        // Record writes do not take the schema lock: the table itself is
        // locked between the count and the ALTER, so a value written in
        // between cannot change type without being counted (review 2026-11-17).
        try {
          await lock.qr.query(
            `LOCK TABLES ${this.engine.qualified(list.table_name)} WRITE`,
          );
        } catch {
          throw new ConflictException(
            'The list is busy right now (someone is using or changing it). Try again in a few seconds.',
          );
        }
        try {
          const affected = await this.engine.retypeImpact(
            list.table_name,
            f.column_name,
            f.type,
            type,
            lock.qr,
          );
          if (affected > 0 && Number(confirmAffected) !== affected) {
            throw new ConflictException({
              message: this.retypeMessage(f, type, affected),
              affected,
            });
          }
          await this.engine.runDdl(lock, {
            kind: 'set_type',
            sql: this.engine.buildModifyColumn(list, f, type),
            listId: list.id,
            requestId,
            userId: actor.userId,
            intent: {
              kind: 'set_type',
              fieldId,
              table: list.table_name,
              column: f.column_name,
              type,
            },
          });
        } finally {
          await lock.qr.query('UNLOCK TABLES').catch(() => undefined);
        }
      } else {
        await this.main.query(
          'UPDATE cl_fields SET type = ?, updated_by = ? WHERE id = ?',
          [type, actor.userId, fieldId],
        );
      }
      return this.fieldRaw(fieldId);
    });
  }

  /**
   * Required, unique and filterable of an existing field; only the rules the
   * request names change. On a published field it is ONE statement
   * (`buildSetRules`). What the data forbids is counted first, with the table
   * locked: the refusal says how many records are in the way, and a server
   * whose `sql_mode` is lax can never turn empty values into '' or 0 to make
   * a column NOT NULL.
   */
  async setRules(
    fieldId: number,
    dto: Record<string, unknown>,
    actor: Actor,
    requestId?: string,
  ) {
    const asked = {
      is_required: flag(dto.is_required, 'Required'),
      is_unique: flag(dto.is_unique, 'Unique'),
      is_indexed: flag(dto.is_indexed, 'Filterable'),
    };
    if (Object.values(asked).every((v) => v === undefined))
      throw new BadRequestException('There is nothing to change.');

    return this.engine.withSchemaLock(async (lock) => {
      const { f, list } = await this.settledField(lock, fieldId, actor);
      const now: FieldRules = {
        is_required: Boolean(f.is_required),
        is_unique: Boolean(f.is_unique),
        is_indexed: Boolean(f.is_indexed),
      };
      const next: FieldRules = {
        is_required: asked.is_required ?? now.is_required,
        is_unique: asked.is_unique ?? now.is_unique,
        is_indexed: asked.is_indexed ?? now.is_indexed,
      };
      assertIndexable({ type: f.type, ...next, label: f.label });
      // The second tap, or a repeat after it was applied: nothing left to do.
      if (
        next.is_required === now.is_required &&
        next.is_unique === now.is_unique &&
        next.is_indexed === now.is_indexed
      )
        return f;

      const counts = (r: FieldRules) =>
        r.is_unique || r.is_indexed || f.type === 'relation';
      if (!counts(now) && counts(next)) {
        const others = (await this.fields(list.id)).filter(
          (x) =>
            x.id !== f.id &&
            (x.is_unique || x.is_indexed || x.type === 'relation'),
        ).length;
        if (others >= LIMITS.indexesPerList) {
          throw new BadRequestException(
            `This list already has ${LIMITS.indexesPerList} filterable or unique fields, the maximum.`,
          );
        }
      }

      const plan =
        list.status === 'published' && f.status === 'published'
          ? this.engine.buildSetRules(list, f, next, actor.userId)
          : null;
      if (!plan) {
        // No column yet, or the table stays as it is: the catalog alone.
        await this.main.query(
          'UPDATE cl_fields SET is_required = ?, is_unique = ?, is_indexed = ?, updated_by = ? WHERE id = ?',
          [
            next.is_required ? 1 : 0,
            next.is_unique ? 1 : 0,
            next.is_indexed ? 1 : 0,
            actor.userId,
            fieldId,
          ],
        );
        return this.fieldRaw(fieldId);
      }

      // Record writes do not take the schema lock: the table itself is locked
      // between the counts and the ALTER, like a type change.
      try {
        await lock.qr.query(
          `LOCK TABLES ${this.engine.qualified(list.table_name)} WRITE`,
        );
      } catch {
        throw new ConflictException(
          'The list is busy right now (someone is using or changing it). Try again in a few seconds.',
        );
      }
      try {
        if (next.is_required && !now.is_required) {
          const empty = await this.engine.countNull(
            list.table_name,
            f.column_name,
            lock.qr,
          );
          if (empty > 0) {
            throw new BadRequestException(
              `${count(empty, 'record')} ${empty === 1 ? 'has' : 'have'} no value in "${f.label}" (inactive records count too). Fill ${empty === 1 ? 'it' : 'them'} in first, then make the field required.`,
            );
          }
        }
        if (next.is_unique && !now.is_unique) {
          const repeated = await this.engine.repeatedValues(
            list.table_name,
            f.column_name,
            lock.qr,
          );
          if (repeated.count > 0) {
            const sample = String(repeated.sample);
            throw new BadRequestException(
              `${count(repeated.count, 'value')} ${repeated.count === 1 ? 'appears' : 'appear'} more than once in "${f.label}", for example "${sample.length > 60 ? sample.slice(0, 60) + '…' : sample}" (inactive records count too). Change ${repeated.count === 1 ? 'it' : 'them'} first, then make the field unique.`,
            );
          }
        }
        await this.engine.runDdl(lock, {
          kind: 'set_rules',
          sql: plan.sql,
          listId: list.id,
          requestId,
          userId: actor.userId,
          intent: plan.intent,
        });
      } finally {
        await lock.qr.query('UNLOCK TABLES').catch(() => undefined);
      }
      return this.fieldRaw(fieldId);
    });
  }

  async deleteField(fieldId: number, actor: Actor, requestId?: string) {
    return this.engine.withSchemaLock(async (lock) => {
      // Refused while the list has an open operation: a draft field with its
      // ADD COLUMN still unconfirmed cannot be dropped from the catalog alone
      // (defect E: the column stayed orphaned and required forever).
      const { f, list } = await this.settledField(lock, fieldId, actor);
      if (list.status === 'published' && f.status === 'published') {
        await this.engine.runDdl(lock, {
          kind: 'delete_field',
          sql: this.engine.buildDropColumn(list, f),
          listId: list.id,
          requestId,
          userId: actor.userId,
          intent: {
            kind: 'delete_field',
            fieldId,
            table: list.table_name,
            column: f.column_name,
          },
        });
      } else {
        await this.main.query('DELETE FROM cl_fields WHERE id = ?', [fieldId]);
      }
      return { deleted: true };
    });
  }

  /** Draft → real table, in one CREATE TABLE. */
  async publish(listId: number, actor: Actor, requestId?: string) {
    return this.engine.withSchemaLock((lock) =>
      this.publishIn(lock, listId, actor, requestId),
    );
  }

  /** The body of `publish`, for a caller that already holds the schema lock. */
  private async publishIn(
    lock: SchemaLock,
    listId: number,
    actor: Actor,
    requestId?: string,
  ) {
    const list = await this.settledList(lock, listId, actor);
    if (list.status === 'published')
      throw new BadRequestException('That list is already published.');
    const fields = await this.fields(listId);
    if (!fields.length)
      throw new BadRequestException(
        'Add at least one field before publishing.',
      );

    const relTables = new Map<number, string>();
    for (const f of fields) {
      if (f.type === 'relation') {
        const target = await this.assertRelationAllowed(
          list,
          f.relation_list_id,
        );
        relTables.set(target.id, target.table_name);
      }
    }
    await this.assertTableFree(list.table_name, lock);
    const op = await this.engine.runDdl(lock, {
      kind: 'publish_list',
      sql: this.engine.buildCreateTable(list, fields, relTables),
      listId,
      requestId,
      userId: actor.userId,
      intent: {
        kind: 'publish_list',
        listId,
        table: list.table_name,
        fieldIds: fields.map((f) => f.id),
      },
    });
    return { ...(await this.find(listId)), sql: op.sql };
  }

  async deleteList(listId: number, actor: Actor, requestId?: string) {
    return this.engine.withSchemaLock(async (lock) => {
      const list = await this.settledList(lock, listId, actor);
      await this.assertNoDependents(list);
      if (list.status === 'published') {
        await this.engine.runDdl(lock, {
          kind: 'delete_list',
          sql: this.engine.buildDropTable(list),
          listId,
          requestId,
          userId: actor.userId,
          intent: { kind: 'delete_list', listId, table: list.table_name },
        });
      } else {
        await this.main.transaction(async (m) => {
          await m.query('DELETE FROM cl_fields WHERE list_id = ?', [listId]);
          await m.query('DELETE FROM cl_lists WHERE id = ?', [listId]);
        });
      }
      return { deleted: true };
    });
  }

  private async assertNoDependents(list: ListRow): Promise<void> {
    const dependents = await this.engine.dependents(list.id);
    if (dependents.length) {
      throw new BadRequestException(
        `"${list.name}" cannot be deleted: ${dependents.join(', ')} ${dependents.length === 1 ? 'uses' : 'use'} it as a relation. Remove that relation first.`,
      );
    }
  }

  async deleteImpact(listId: number, actor: Actor) {
    const list = await this.owned(listId, actor);
    const rows =
      list.status === 'published'
        ? await this.engine.countRows(list.table_name)
        : 0;
    const dependents = await this.engine.dependents(listId);
    return {
      rows,
      dependents,
      message: dependents.length
        ? `"${list.name}" cannot be deleted: ${dependents.join(', ')} ${dependents.length === 1 ? 'uses' : 'use'} it as a relation.`
        : rows
          ? `The whole list and its ${count(rows, 'record')} are deleted, and its public address stops answering. This cannot be undone.`
          : 'The list is deleted and its public address stops answering. It has no records.',
    };
  }
}
