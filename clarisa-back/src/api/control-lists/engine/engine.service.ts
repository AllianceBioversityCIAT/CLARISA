import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, QueryRunner } from 'typeorm';
import {
  FIELD_TYPES,
  FieldType,
  assertIndexable,
  isFieldType,
  valueChangesOnRetype,
} from './field-types';
import { LazyDb } from './lazy-db';

/**
 * Control lists engine.
 *
 *   1. CATALOG (`cl_lists`, `cl_fields`, main schema) describes every list. It
 *      is the source of truth.
 *   2. COMPILER turns one change of the catalog into exactly ONE DDL statement
 *      on a list table (`cl_<code>`, CLARISA's database by default; nothing
 *      else can be named, see `assertListTable`).
 *   3. LOG (`cl_schema_ops`) records the operation BEFORE the DDL runs and is
 *      closed after the catalog is written, because MySQL cannot roll back a
 *      DDL statement (dev.mysql.com/doc/refman/8.0/en/cannot-roll-back.html).
 *      An operation left open is decided by looking at the real structure.
 *
 * Changes from the lab, each from the review of 2026-11-13 (§4, §5, §8):
 *   - The named lock covers the WHOLE operation (checks → DDL → catalog), not
 *     just the statement: callers run inside `withSchemaLock`.
 *   - Every change on a list first settles the open operations of that list;
 *     while one stays open, the change is refused (409).
 *   - Only an error SENT BY THE SERVER means "the structure did not change".
 *     A dropped connection leaves the operation open: the server may finish
 *     the ALTER after the client is gone (defect K).
 *   - A failed operation retried with the same id runs again (defect H).
 *   - The catalog step is stored as an intent (kind + ids), never as SQL.
 *   - The settle step is exactly-once: the log row is locked (`FOR UPDATE`)
 *     and the catalog is written in the same transaction that closes it.
 */

export interface ListRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  owner_role_id: number;
  table_name: string;
  status: 'draft' | 'published';
}

export interface FieldRow {
  id: number;
  list_id: number;
  code: string;
  label: string;
  type: FieldType;
  column_name: string;
  is_required: number;
  is_unique: number;
  is_indexed: number;
  relation_list_id: number | null;
  position: number;
  status: 'draft' | 'published';
}

/** What the catalog must record once the DDL has landed. Data, not SQL. */
export type Intent =
  | { kind: 'publish_list'; listId: number; table: string; fieldIds: number[] }
  | { kind: 'publish_field'; fieldId: number; table: string; column: string }
  | {
      kind: 'rename_field';
      fieldId: number;
      table: string;
      from: string;
      to: string;
    }
  | {
      kind: 'set_type';
      fieldId: number;
      table: string;
      column: string;
      type: FieldType;
    }
  | { kind: 'delete_field'; fieldId: number; table: string; column: string }
  | { kind: 'delete_list'; listId: number; table: string };

export interface OpRow {
  id: number;
  request_id: string;
  list_id: number | null;
  kind: string;
  sql_text: string;
  intent_json: string | null;
  status: 'pending' | 'applied' | 'failed';
  age_seconds: number;
}

/** The connection that holds the schema lock for one whole operation. */
export interface SchemaLock {
  readonly qr: QueryRunner;
}

/** Marks an error that guarantees the structure did NOT change. */
export function unchanged<E extends Error>(
  e: E,
): E & { schemaUnchanged: true } {
  (e as any).schemaUnchanged = true;
  return e as E & { schemaUnchanged: true };
}

/**
 * True only for an error the MySQL server answered (it has a SQLSTATE and the
 * connection is still alive). Those statements did not run: DDL on InnoDB is
 * atomic in MySQL 8. Anything else (lost connection, socket reset, timeout on
 * the client) leaves the outcome unknown.
 */
export function isServerSqlError(e: any): boolean {
  const d = e?.driverError ?? e;
  if (!d || d.fatal) return false;
  return (
    typeof d.sqlState === 'string' &&
    typeof d.errno === 'number' &&
    !d.sqlState.startsWith('08')
  );
}

/** The catalog's own tables: never the table of a list. */
export const CATALOG_TABLES = new Set([
  'cl_lists',
  'cl_fields',
  'cl_schema_ops',
]);

/**
 * Quotes the database name. It comes from configuration (CLARISA's own
 * database may have capitals, e.g. `clarisaDB`), never from a request.
 */
export function quoteSchema(name: string): string {
  if (typeof name !== 'string' || !/^[A-Za-z0-9_$-]{1,64}$/.test(name)) {
    throw new ServiceUnavailableException(
      'Control lists are not configured: no valid database name.',
    );
  }
  return '`' + name + '`';
}

/**
 * Chokepoint: the only tables the module ever names are list tables
 * (`cl_<code>`, not the catalog). The lists share CLARISA's database, so a
 * bug can never reach `institutions`, `roles` or any other table.
 */
export function assertListTable(table: string): void {
  if (
    typeof table !== 'string' ||
    !/^cl_[a-z][a-z0-9_]{0,60}$/.test(table) ||
    CATALOG_TABLES.has(table)
  ) {
    throw new InternalServerErrorException(
      `Refused to touch "${table}": it is not the table of a control list.`,
    );
  }
}

export const LIMITS = {
  listsPerOwner: 50,
  fieldsPerList: 40,
  indexesPerList: 15,
};

/** Seconds a DDL waits for a busy table before answering "try again". */
const LOCK_WAIT_SECONDS = 5;
/** Seconds a change waits for another change of the schema. */
const SCHEMA_LOCK_SECONDS = 10;

export class EngineService {
  private readonly logger = new Logger('ControlListsEngine');

  constructor(
    /** Main schema (catalog + log), through the existing CLARISA connection. */
    private readonly main: DataSource,
    /** Engine user: the only one that changes structure, only in its schema. */
    private readonly cl: LazyDb,
    private readonly schemaName: () => string,
    private readonly graceSeconds: () => number,
  ) {}

  /** Validated on every read: an empty or odd name stops the module (503), before any query. */
  get schema(): string {
    const name = this.schemaName();
    quoteSchema(name);
    return name;
  }

  // ───────────────────────────── identifiers ─────────────────────────────

  private id(name: string): string {
    if (typeof name !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(name)) {
      throw new BadRequestException(`Invalid identifier: ${name}`);
    }
    return '`' + name + '`';
  }

  qualified(table: string): string {
    assertListTable(table);
    return `${quoteSchema(this.schema)}.${this.id(table)}`;
  }

  /** Lock names are server-wide: two environments on one server must not share one. */
  private lockName(): string {
    return `cl_schema:${this.schema}`.slice(0, 64);
  }

  // Constraint names go by id: names built from list + field codes collided
  // (`tipo_suelo`+`nivel` vs `tipo`+`suelo_nivel`) and survived renames.
  fkName(list: ListRow, f: FieldRow): string {
    return `fk_cl_${list.id}_${f.id}`;
  }
  private indexName(list: ListRow, f: FieldRow): string {
    return `ix_cl_${list.id}_${f.id}`;
  }
  private uniqueName(list: ListRow, f: FieldRow): string {
    return `uq_cl_${list.id}_${f.id}`;
  }

  // ─────────────────────────────── compiler ───────────────────────────────

  private columnDef(
    f: Pick<FieldRow, 'type' | 'column_name' | 'is_required'>,
  ): string {
    if (!isFieldType(f.type))
      throw new BadRequestException(`Unknown type: ${f.type}`);
    const nullability = f.is_required ? 'NOT NULL' : 'NULL';
    return `${this.id(f.column_name)} ${FIELD_TYPES[f.type].sql} ${nullability}`;
  }

  /** Columns, audit, indexes and foreign keys in ONE statement. */
  buildCreateTable(
    list: ListRow,
    fields: FieldRow[],
    relTables: Map<number, string>,
  ): string {
    const parts: string[] = [
      '`id` BIGINT NOT NULL AUTO_INCREMENT',
      ...fields.map((f) => this.columnDef(f)),
      '`is_active` TINYINT(1) NOT NULL DEFAULT 1',
      '`created_by` BIGINT NULL',
      '`updated_by` BIGINT NULL',
      '`modification_justification` VARCHAR(500) NULL',
      // Idempotent record creation: the same form sent twice carries the same
      // id and the second insert hits this key instead of creating a twin.
      '`request_id` VARCHAR(64) NULL',
      '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
      '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
      'PRIMARY KEY (`id`)',
      `UNIQUE KEY ${this.id('uq_cl_' + list.id + '_req')} (\`request_id\`)`,
    ];
    for (const f of fields) {
      assertIndexable(f);
      if (f.is_unique) {
        parts.push(
          `UNIQUE KEY ${this.id(this.uniqueName(list, f))} (${this.id(f.column_name)})`,
        );
      } else if (f.is_indexed || f.type === 'relation') {
        parts.push(
          `KEY ${this.id(this.indexName(list, f))} (${this.id(f.column_name)})`,
        );
      }
      if (f.type === 'relation') {
        const target = relTables.get(Number(f.relation_list_id));
        if (!target) {
          throw unchanged(
            new BadRequestException(
              `The field "${f.code}" points to a list that no longer exists.`,
            ),
          );
        }
        parts.push(
          `CONSTRAINT ${this.id(this.fkName(list, f))} FOREIGN KEY (${this.id(f.column_name)}) ` +
            `REFERENCES ${this.qualified(target)} (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
        );
      }
    }
    return (
      `CREATE TABLE ${this.qualified(list.table_name)} (\n  ` +
      parts.join(',\n  ') +
      '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci'
    );
  }

  buildAddColumn(list: ListRow, f: FieldRow, relTable?: string): string {
    assertIndexable(f);
    const clauses = [`ADD COLUMN ${this.columnDef(f)}`];
    if (f.is_unique) {
      clauses.push(
        `ADD UNIQUE KEY ${this.id(this.uniqueName(list, f))} (${this.id(f.column_name)})`,
      );
    } else if (f.is_indexed || f.type === 'relation') {
      clauses.push(
        `ADD KEY ${this.id(this.indexName(list, f))} (${this.id(f.column_name)})`,
      );
    }
    if (f.type === 'relation') {
      clauses.push(
        `ADD CONSTRAINT ${this.id(this.fkName(list, f))} FOREIGN KEY (${this.id(f.column_name)}) ` +
          `REFERENCES ${this.qualified(relTable)} (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
      );
    }
    return `ALTER TABLE ${this.qualified(list.table_name)} ${clauses.join(', ')}`;
  }

  buildRenameColumn(list: ListRow, from: string, to: string): string {
    return `ALTER TABLE ${this.qualified(list.table_name)} RENAME COLUMN ${this.id(from)} TO ${this.id(to)}`;
  }

  buildModifyColumn(list: ListRow, f: FieldRow, type: FieldType): string {
    return `ALTER TABLE ${this.qualified(list.table_name)} MODIFY COLUMN ${this.columnDef({ ...f, type })}`;
  }

  /** MySQL refuses to drop a column holding a foreign key (1829): drop both at once. */
  buildDropColumn(list: ListRow, f: FieldRow): string {
    const clauses: string[] = [];
    if (f.type === 'relation')
      clauses.push(`DROP FOREIGN KEY ${this.id(this.fkName(list, f))}`);
    clauses.push(`DROP COLUMN ${this.id(f.column_name)}`);
    return `ALTER TABLE ${this.qualified(list.table_name)} ${clauses.join(', ')}`;
  }

  buildDropTable(list: ListRow): string {
    return `DROP TABLE ${this.qualified(list.table_name)}`;
  }

  // ───────────────────────────── schema lock ─────────────────────────────

  /**
   * Runs `fn` holding the schema lock on one engine connection, so the
   * checks, the DDL and the catalog write of one change never interleave with
   * another change (review 2026-11-13 §5: checks ran before the lock, and a
   * relation field created meanwhile left a list "published" without table).
   */
  async withSchemaLock<T>(fn: (lock: SchemaLock) => Promise<T>): Promise<T> {
    const qr = await this.cl.runner();
    let held = false;
    try {
      const r = await qr.query('SELECT GET_LOCK(?, ?) AS ok', [
        this.lockName(),
        SCHEMA_LOCK_SECONDS,
      ]);
      if (Number(r[0]?.ok) !== 1) {
        throw new ConflictException(
          'Someone else is changing control lists right now. Try again in a few seconds.',
        );
      }
      held = true;
      await qr.query(`SET SESSION lock_wait_timeout = ${LOCK_WAIT_SECONDS}`);
      return await fn({ qr });
    } finally {
      await this.unlock(qr, held);
    }
  }

  /**
   * Gives the lock back. If RELEASE_LOCK fails, the connection is destroyed
   * instead of returned to the pool: a pooled connection still holding the
   * named lock would refuse every change until it closed (review 2026-11-17).
   */
  private async unlock(qr: QueryRunner, held: boolean): Promise<void> {
    if (held) {
      try {
        await qr.query('UNLOCK TABLES');
        await qr.query('SELECT RELEASE_LOCK(?)', [this.lockName()]);
      } catch {
        (qr as any).databaseConnection?.destroy?.();
      }
    }
    await qr.release().catch(() => undefined);
  }

  /** Same lock without waiting; `null` when another instance holds it. */
  private async tryLock<T>(
    fn: (lock: SchemaLock) => Promise<T>,
  ): Promise<T | null> {
    const qr = await this.cl.runner();
    let held = false;
    try {
      const r = await qr.query('SELECT GET_LOCK(?, 0) AS ok', [
        this.lockName(),
      ]);
      if (Number(r[0]?.ok) !== 1) return null;
      held = true;
      return await fn({ qr });
    } finally {
      await this.unlock(qr, held);
    }
  }

  // ─────────────────────────────── the log ───────────────────────────────

  /**
   * Runs ONE DDL statement inside a held lock and records it:
   *   pending → DDL → (catalog + applied, one transaction)
   * The same `requestId` with the same content is the same operation: applied
   * returns, failed runs again, pending is refused. With other content: 409.
   */
  async runDdl(
    lock: SchemaLock,
    op: {
      kind: Intent['kind'];
      sql: string;
      listId: number | null;
      requestId?: string;
      intent: Intent;
      userId?: number;
    },
  ): Promise<{ requestId: string; sql: string }> {
    const requestId = op.requestId ?? randomUUID();
    const intentJson = JSON.stringify(op.intent);
    const prev: any[] = await this.main.query(
      'SELECT status, kind, list_id, sql_text FROM cl_schema_ops WHERE request_id = ?',
      [requestId],
    );

    if (prev.length) {
      const p = prev[0];
      const sameTarget =
        p.kind === op.kind &&
        String(p.list_id ?? '') === String(op.listId ?? '');
      const sameSql = p.sql_text === op.sql;
      // An applied or running operation is only "the same" with the same SQL.
      // A FAILED one left nothing behind, so the same id may carry the retry
      // even when its SQL differs (an indexed field retried gets a new field
      // id, hence new index names).
      if (!sameTarget || (p.status !== 'failed' && !sameSql)) {
        throw unchanged(
          new ConflictException(
            'That operation id was already used for a different change. Start again from the screen.',
          ),
        );
      }
      if (p.status === 'applied') return { requestId, sql: op.sql };
      if (p.status === 'pending') {
        throw unchanged(
          new ConflictException(
            'That same change is still being confirmed. Reload in a moment.',
          ),
        );
      }
      // failed → run it again (defect H: the retry answered "already failed").
      const r: any = await this.main.query(
        `UPDATE cl_schema_ops
            SET status = 'pending', error_text = NULL, sql_text = ?, intent_json = ?, created_by = ?,
                started_at = NOW(), finished_at = NULL
          WHERE request_id = ? AND status = 'failed'`,
        [op.sql, intentJson, op.userId ?? null, requestId],
      );
      if (!this.affected(r)) {
        throw unchanged(
          new ConflictException(
            'That same change is already running. Reload in a moment.',
          ),
        );
      }
    } else {
      try {
        await this.main.query(
          `INSERT INTO cl_schema_ops (request_id, list_id, kind, sql_text, intent_json, status, created_by)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
          [
            requestId,
            op.listId,
            op.kind,
            op.sql,
            intentJson,
            op.userId ?? null,
          ],
        );
      } catch (e) {
        if (/duplicate entry/i.test(String(e?.message))) {
          throw unchanged(
            new ConflictException(
              'That same change is already running. Reload in a moment.',
            ),
          );
        }
        throw unchanged(e);
      }
    }

    try {
      await lock.qr.query(op.sql);
    } catch (e) {
      if (isServerSqlError(e)) {
        await this.markFailed(requestId, String(e?.message ?? e));
        throw unchanged(this.humanize(e, requestId));
      }
      // Unknown outcome: the server may still apply it. The log stays open and
      // the structure decides (`settle`), never this guess.
      this.logger.error(
        `[${op.kind}] outcome unknown · ${requestId} · ${e?.message}`,
      );
      throw new ServiceUnavailableException(
        `The connection dropped while the change was running. CLARISA confirms the result on its own within a few minutes; reload the list then. Reference: ${requestId}.`,
      );
    }

    // The DDL landed: there is no way back. Retry the catalog right away; what
    // still fails stays pending and `settle` finishes it later.
    let lastError: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.finish(requestId);
        this.logger.log(`[${op.kind}] applied · ${requestId}`);
        return { requestId, sql: op.sql };
      } catch (e) {
        lastError = e;
        this.logger.warn(
          `Catalog attempt ${attempt}/3 · ${requestId} · ${e?.message}`,
        );
        if (attempt < 3) await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }
    this.logger.error(
      `[${op.kind}] applied in the database, catalog pending · ${requestId} · ${lastError?.message}`,
    );
    throw new InternalServerErrorException(
      `The change was applied in the database but could not be recorded yet. CLARISA completes it on its own; reload in a minute. Reference: ${requestId}.`,
    );
  }

  private affected(r: any): number {
    return Number(r?.affectedRows ?? r?.[1] ?? 0);
  }

  private async markFailed(requestId: string, error: string): Promise<void> {
    await this.main
      .query(
        "UPDATE cl_schema_ops SET status = 'failed', error_text = ?, finished_at = NOW() WHERE request_id = ? AND status = 'pending'",
        [error.slice(0, 2000), requestId],
      )
      .catch(() => undefined);
  }

  /**
   * Writes the catalog step of an operation and closes it, exactly once: the
   * log row is locked first and nothing is written unless it is still pending.
   */
  private async finish(requestId: string): Promise<void> {
    const qr = this.main.createQueryRunner();
    await qr.connect();
    try {
      await qr.startTransaction();
      const rows = await qr.query(
        "SELECT intent_json FROM cl_schema_ops WHERE request_id = ? AND status = 'pending' FOR UPDATE",
        [requestId],
      );
      if (rows.length) {
        const intent = this.parseIntent(rows[0].intent_json);
        if (!intent) throw new Error(`Unreadable intent for ${requestId}`);
        await this.applyIntent(qr, intent);
        await qr.query(
          "UPDATE cl_schema_ops SET status = 'applied', error_text = NULL, finished_at = NOW() WHERE request_id = ?",
          [requestId],
        );
      }
      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction().catch(() => undefined);
      throw e;
    } finally {
      await qr.release().catch(() => undefined);
    }
  }

  private parseIntent(json: string | null): Intent | null {
    try {
      const v = JSON.parse(json ?? '');
      return v && typeof v.kind === 'string' ? (v as Intent) : null;
    } catch {
      return null;
    }
  }

  /** Every step is idempotent: running it twice leaves the same catalog. */
  private async applyIntent(qr: QueryRunner, intent: Intent): Promise<void> {
    switch (intent.kind) {
      case 'publish_list':
        await qr.query(
          "UPDATE cl_lists SET status = 'published' WHERE id = ?",
          [intent.listId],
        );
        if (intent.fieldIds.length) {
          await qr.query(
            `UPDATE cl_fields SET status = 'published' WHERE id IN (${intent.fieldIds.map(() => '?').join(',')})`,
            intent.fieldIds,
          );
        }
        return;
      case 'publish_field':
        await qr.query(
          "UPDATE cl_fields SET status = 'published' WHERE id = ?",
          [intent.fieldId],
        );
        return;
      case 'rename_field':
        await qr.query(
          'UPDATE cl_fields SET code = ?, column_name = ? WHERE id = ?',
          [intent.to, intent.to, intent.fieldId],
        );
        return;
      case 'set_type':
        await qr.query('UPDATE cl_fields SET type = ? WHERE id = ?', [
          intent.type,
          intent.fieldId,
        ]);
        return;
      case 'delete_field':
        await qr.query('DELETE FROM cl_fields WHERE id = ?', [intent.fieldId]);
        return;
      case 'delete_list':
        await qr.query('DELETE FROM cl_fields WHERE list_id = ?', [
          intent.listId,
        ]);
        await qr.query('DELETE FROM cl_lists WHERE id = ?', [intent.listId]);
        return;
    }
  }

  /**
   * Closes an open operation whose DDL did not land. A field that only
   * existed for it (still draft) leaves the catalog in the same transaction,
   * so the same request can be retried (review 2026-11-17: the orphan draft
   * made the retry answer "already exists").
   */
  private async fail(requestId: string, intent: Intent): Promise<void> {
    await this.main.transaction(async (m) => {
      const rows = await m.query(
        "SELECT id FROM cl_schema_ops WHERE request_id = ? AND status = 'pending' FOR UPDATE",
        [requestId],
      );
      if (!rows.length) return;
      await m.query(
        "UPDATE cl_schema_ops SET status = 'failed', error_text = ?, finished_at = NOW() WHERE request_id = ?",
        [
          'The connection dropped and the change never reached the database; nothing was changed.',
          requestId,
        ],
      );
      if (intent.kind === 'publish_field') {
        await m.query(
          "DELETE FROM cl_fields WHERE id = ? AND status = 'draft'",
          [intent.fieldId],
        );
      }
    });
  }

  /** Did the DDL of this operation land? Decided by the real structure only. */
  private async landed(intent: Intent, q: QueryRunner): Promise<boolean> {
    switch (intent.kind) {
      case 'publish_list':
        return this.tableExists(intent.table, q);
      case 'delete_list':
        return !(await this.tableExists(intent.table, q));
      case 'publish_field':
        return this.columnExists(intent.table, intent.column, q);
      case 'delete_field':
        return !(await this.columnExists(intent.table, intent.column, q));
      case 'rename_field':
        return (
          (await this.columnExists(intent.table, intent.to, q)) &&
          !(await this.columnExists(intent.table, intent.from, q))
        );
      case 'set_type':
        return this.typeMatches(
          intent.table,
          intent.column,
          FIELD_TYPES[intent.type].sql,
          q,
        );
    }
  }

  /**
   * Decides every open operation (of one list, or all). Landed → the catalog
   * is completed and the operation closed. Not landed and older than the grace
   * period → failed (nothing to undo). Otherwise it stays open.
   * Must run holding the schema lock, and checks the structure on THAT
   * connection: taking another one from the small engine pool while others
   * wait for the lock could starve the holder (review 2026-11-17).
   * Returns the operations still open.
   */
  private async settleOpen(
    q: QueryRunner,
    listId: number | null,
  ): Promise<OpRow[]> {
    const ops: OpRow[] = await this.main.query(
      `SELECT id, request_id, list_id, kind, sql_text, intent_json, status,
              TIMESTAMPDIFF(SECOND, started_at, NOW()) AS age_seconds
         FROM cl_schema_ops
        WHERE status = 'pending' ${listId === null ? '' : 'AND list_id = ?'}
        ORDER BY id`,
      listId === null ? [] : [listId],
    );
    const open: OpRow[] = [];
    for (const op of ops) {
      const intent = this.parseIntent(op.intent_json);
      if (!intent) {
        this.logger.error(
          `Operation ${op.request_id} has an unreadable intent; left open for manual review.`,
        );
        open.push(op);
        continue;
      }
      try {
        if (await this.landed(intent, q)) {
          await this.finish(op.request_id);
          this.logger.warn(`Settled ${op.request_id} (${op.kind}) as applied.`);
          continue;
        }
        if (
          Number(op.age_seconds) >= this.graceSeconds() &&
          !(await this.stillRunning(op.sql_text, q))
        ) {
          await this.fail(op.request_id, intent);
          this.logger.warn(`Settled ${op.request_id} (${op.kind}) as failed.`);
          continue;
        }
      } catch (e) {
        this.logger.error(`Cannot settle ${op.request_id} yet: ${e?.message}`);
      }
      open.push(op);
    }
    return open;
  }

  /**
   * Before any change on a list: settle what that list left open. While
   * something stays open, the change is refused (defects D and E: a list
   * stopped accepting records, and deleting the draft field made it permanent).
   */
  async settleList(lock: SchemaLock, listId: number): Promise<void> {
    const open = await this.settleOpen(lock.qr, listId);
    if (open.length) {
      throw unchanged(
        new ConflictException(
          'A previous change to this list is still being confirmed. Try again in a minute.',
        ),
      );
    }
  }

  /** Timer and boot: settle everything, only if no change is running. */
  async reconcile(): Promise<{ open: number } | null> {
    return this.tryLock(async (lock) => ({
      open: (await this.settleOpen(lock.qr, null)).length,
    }));
  }

  /**
   * MySQL's error in words a person understands. Unknown errors do not leave
   * raw (schema names, SQL): they go to the log with a reference.
   */
  private humanize(e: any, requestId: string): Error {
    const msg = String(e?.message ?? e);
    if (/Lock wait timeout/i.test(msg)) {
      return new ConflictException(
        'The list is busy right now (someone is using or changing it). Try again in a few seconds.',
      );
    }
    if (
      /Cannot delete or update a parent row|referenced by a foreign key/i.test(
        msg,
      )
    ) {
      return new BadRequestException(
        'It cannot be deleted: another list depends on it. Remove that relation first.',
      );
    }
    if (
      /Cannot add or update a child row|foreign key constraint fails/i.test(msg)
    ) {
      return new BadRequestException(
        'Some records point to a value that does not exist in the related list.',
      );
    }
    if (/Duplicate entry/i.test(msg)) {
      return new BadRequestException(
        'There are repeated values: the field cannot be unique while they exist.',
      );
    }
    if (
      /Data too long|Incorrect .* value|Out of range|Data truncated|Truncated incorrect/i.test(
        msg,
      )
    ) {
      return new BadRequestException(
        'Some records hold values that do not fit the chosen type. Fix them before changing the type.',
      );
    }
    if (/command denied|access denied/i.test(msg)) {
      return new BadRequestException(
        'The database user is not allowed to do that operation.',
      );
    }
    if (/already exists|Duplicate column name/i.test(msg)) {
      return new BadRequestException(
        'That already exists in the database. Reload the screen to see its real state.',
      );
    }
    this.logger.error(`Untranslated SQL error [${requestId}]: ${msg}`);
    return new BadRequestException(
      `The change could not be applied. Report this reference to the administrator: ${requestId}.`,
    );
  }

  // ───────────────────────────── introspection ─────────────────────────────

  private run(sql: string, params: unknown[], q?: QueryRunner): Promise<any> {
    return q ? q.query(sql, params) : this.cl.query(sql, params);
  }

  async tableExists(table: string, q?: QueryRunner): Promise<boolean> {
    const r = await this.run(
      'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      [this.schema, table],
      q,
    );
    return Number(r[0].n) > 0;
  }

  async columnExists(
    table: string,
    column: string,
    q?: QueryRunner,
  ): Promise<boolean> {
    const r = await this.run(
      'SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [this.schema, table, column],
      q,
    );
    return Number(r[0].n) > 0;
  }

  /**
   * Compares by parts, not by the COLUMN_TYPE text: MySQL answers `bigint`
   * since 8.0.19 and `bigint(20)` before.
   */
  private async typeMatches(
    table: string,
    column: string,
    want: string,
    q: QueryRunner,
  ): Promise<boolean> {
    const r = await this.run(
      `SELECT DATA_TYPE AS base, CHARACTER_MAXIMUM_LENGTH AS len,
              NUMERIC_PRECISION AS prec, NUMERIC_SCALE AS scale
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [this.schema, table, column],
      q,
    );
    if (!r.length) return false;
    const m = /^([a-z]+)(?:\((\d+)(?:,(\d+))?\))?$/i.exec(want);
    if (!m) return false;
    const [, base, one, two] = m;
    const real = r[0];
    if (String(real.base).toLowerCase() !== base.toLowerCase()) return false;
    if (one === undefined) return true;
    if (real.len !== null && real.len !== undefined)
      return Number(real.len) === Number(one);
    if (two !== undefined)
      return (
        Number(real.prec) === Number(one) && Number(real.scale) === Number(two)
      );
    return true; // TINYINT(1): the display width does not decide
  }

  /**
   * Whether the server is still executing that statement for the engine user
   * (after the client dropped, MySQL may keep running the ALTER). A user sees
   * its own threads in PROCESSLIST without the PROCESS privilege.
   */
  private async stillRunning(sql: string, q: QueryRunner): Promise<boolean> {
    const r = await this.run(
      `SELECT COUNT(*) AS n FROM information_schema.PROCESSLIST
        WHERE USER = SUBSTRING_INDEX(CURRENT_USER(), '@', 1) AND ID <> CONNECTION_ID() AND INFO = ?`,
      [sql],
      q,
    );
    return Number(r[0].n) > 0;
  }

  async showCreate(table: string): Promise<string> {
    const r = await this.cl.query(`SHOW CREATE TABLE ${this.qualified(table)}`);
    return r[0]['Create Table'];
  }

  async countRows(table: string, q?: QueryRunner): Promise<number> {
    const sql = `SELECT COUNT(*) AS n FROM ${this.qualified(table)}`;
    const r = q ? await q.query(sql) : await this.cl.query(sql);
    return Number(r[0].n);
  }

  async countNotNull(table: string, column: string): Promise<number> {
    const r = await this.cl.query(
      `SELECT COUNT(*) AS n FROM ${this.qualified(table)} WHERE ${this.id(column)} IS NOT NULL`,
    );
    return Number(r[0].n);
  }

  /**
   * How many records would see their value change (or stop fitting) if the
   * column became `to`. Reads distinct values; control lists are small.
   */
  async retypeImpact(
    table: string,
    column: string,
    from: FieldType,
    to: FieldType,
    q?: QueryRunner,
  ): Promise<number> {
    const sql =
      `SELECT CAST(${this.id(column)} AS CHAR) AS v, COUNT(*) AS n FROM ${this.qualified(table)} ` +
      `WHERE ${this.id(column)} IS NOT NULL GROUP BY CAST(${this.id(column)} AS CHAR)`;
    const rows: Array<{ v: string; n: number }> = q
      ? await q.query(sql)
      : await this.cl.query(sql);
    return rows.reduce(
      (sum, r) =>
        sum + (valueChangesOnRetype(to, String(r.v), from) ? Number(r.n) : 0),
      0,
    );
  }

  /** Lists with a field (published or draft) pointing to this one. */
  async dependents(listId: number): Promise<string[]> {
    const rows = await this.main.query(
      `SELECT DISTINCT l.name FROM cl_fields f JOIN cl_lists l ON l.id = f.list_id
        WHERE f.relation_list_id = ? AND l.id <> ?`,
      [listId, listId],
    );
    return rows.map((r: any) => r.name);
  }
}
