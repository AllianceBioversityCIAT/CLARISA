import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  EngineService,
  FieldRow,
  LIMITS,
  ListRow,
  SchemaLock,
} from './engine/engine.service';
import {
  FIELD_TYPES,
  FieldType,
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

  async ownedByCode(code: string, actor: Actor): Promise<ListRow> {
    const list = await this.byCode(code);
    this.assertOwner(list, actor);
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

    return this.engine.withSchemaLock(async (lock) => {
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
    });
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
  ): Promise<FieldRow> {
    assertFieldCode(dto.code);
    const code = dto.code;
    if (!isFieldType(dto.type))
      throw new BadRequestException('Unknown field type.');
    const type: FieldType = dto.type;
    const label = text(dto.label, 'The field label', MAX.label, false) ?? code;
    const flags = {
      is_required: bool(dto.is_required),
      is_unique: bool(dto.is_unique),
      is_indexed: bool(dto.is_indexed),
    };
    assertIndexable({ type, ...flags, label });

    return this.engine.withSchemaLock(async (lock) => {
      const list = await this.settledList(lock, listId, actor);

      const existing = await this.fields(listId);
      if (existing.length >= LIMITS.fieldsPerList) {
        throw new BadRequestException(
          `This list already has ${LIMITS.fieldsPerList} fields, the maximum.`,
        );
      }
      const indexed = existing.filter(
        (f) => f.is_unique || f.is_indexed || f.type === 'relation',
      ).length;
      if (
        (flags.is_unique || flags.is_indexed || type === 'relation') &&
        indexed >= LIMITS.indexesPerList
      ) {
        throw new BadRequestException(
          `This list already has ${LIMITS.indexesPerList} filterable or unique fields, the maximum.`,
        );
      }
      if (existing.some((f) => f.code === code)) {
        throw new BadRequestException(
          `The field "${code}" already exists in this list.`,
        );
      }

      // Only a relation field stores a target: a text field with someone
      // else's list id would otherwise block deleting that list.
      let relTable: string | undefined;
      let relationId: number | null = null;
      if (type === 'relation') {
        const target = await this.assertRelationAllowed(
          list,
          dto.relation_list_id,
        );
        relTable = target.table_name;
        relationId = target.id;
      }

      if (list.status === 'published' && flags.is_required) {
        const rows = await this.engine.countRows(list.table_name, lock.qr);
        if (rows > 0) {
          throw new BadRequestException(
            `The list already has ${rows} record(s). A new field cannot start as required: create it optional and fill the data first.`,
          );
        }
      }

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
          flags.is_required ? 1 : 0,
          flags.is_unique ? 1 : 0,
          flags.is_indexed ? 1 : 0,
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
            ? `The field "${f.label}" is deleted with the values of ${withData} record(s). This cannot be undone.`
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
      ? `Changing "${f.label}" to ${FIELD_TYPES[to].label} changes or does not fit ${affected} record(s). Confirm with that number to go ahead.`
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
    return this.engine.withSchemaLock(async (lock) => {
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
    });
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
          ? `The whole list and its ${rows} record(s) are deleted, and its public address stops answering. This cannot be undone.`
          : 'The list is deleted and its public address stops answering. It has no records.',
    };
  }
}
