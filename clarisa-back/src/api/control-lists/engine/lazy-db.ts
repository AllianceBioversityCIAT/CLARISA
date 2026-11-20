import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, DataSourceOptions, QueryRunner } from 'typeorm';

/**
 * Strict mode for every session of this module. Without it a server whose
 * global `sql_mode` is lax truncates or zeroes data on a type change or an
 * insert instead of failing (review 2026-11-13, §8).
 */
export const STRICT_SQL_MODE =
  'STRICT_ALL_TABLES,ONLY_FULL_GROUP_BY,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

/**
 * Seconds a statement waits for a table that is being changed. A rules or
 * type change locks the table (and the lists related to it by foreign key)
 * while it counts and alters; the server default is a YEAR, so a few readers
 * waiting would hold every connection of the pool (review 2026-11-20).
 */
export const LOCK_WAIT_SECONDS = 10;

export const BUSY_MESSAGE =
  'The list is busy right now (it is being changed). Try again in a few seconds.';

/** MySQL 1205: the wait for a lock ran out. Nothing was read or written. */
export function isLockWaitTimeout(e: any): boolean {
  const d = e?.driverError ?? e;
  return (
    d?.errno === 1205 ||
    /Lock wait timeout exceeded/i.test(String(e?.message ?? ''))
  );
}

/**
 * A connection that opens on first use, not at boot.
 *
 * A second datasource registered with `TypeOrmModule.forRoot` fails module
 * initialisation when its schema or user is missing, and that stops the whole
 * API before `listen()`. Here a failure only makes this module answer 503.
 *
 * Every connection handed out comes with the strict `sql_mode` and a bounded
 * lock wait already set, because a plain `query()` may land on any connection
 * of the pool.
 */
export class LazyDb {
  private readonly logger: Logger;
  private pending: Promise<DataSource> | null = null;
  private ds: DataSource | null = null;

  constructor(
    private readonly options: () => DataSourceOptions,
    private readonly label: string,
  ) {
    this.logger = new Logger(`ControlLists:${label}`);
  }

  private async ready(): Promise<DataSource> {
    if (this.ds?.isInitialized) return this.ds;
    if (!this.pending) {
      const ds = new DataSource(this.options());
      this.pending = ds
        .initialize()
        .then((ready) => {
          this.ds = ready;
          return ready;
        })
        .catch((e) => {
          this.pending = null; // the next call tries again
          this.logger.error(`Cannot connect (${this.label}): ${e?.message}`);
          throw new ServiceUnavailableException(
            'Control lists are not available right now. The rest of CLARISA works normally.',
          );
        });
    }
    return this.pending;
  }

  /** A dedicated connection, strict mode set. The caller releases it. */
  async runner(): Promise<QueryRunner> {
    const ds = await this.ready();
    const qr = ds.createQueryRunner();
    try {
      await qr.connect();
      await qr.query(
        `SET SESSION sql_mode = '${STRICT_SQL_MODE}', lock_wait_timeout = ${LOCK_WAIT_SECONDS}`,
      );
    } catch (e) {
      await qr.release().catch(() => undefined);
      throw e;
    }
    return qr;
  }

  /** One statement on its own connection (strict mode included). */
  async query<T = any>(sql: string, params?: unknown[]): Promise<T> {
    const qr = await this.runner();
    try {
      return await qr.query(sql, params);
    } catch (e) {
      if (isLockWaitTimeout(e))
        throw new ServiceUnavailableException(BUSY_MESSAGE);
      throw e;
    } finally {
      await qr.release().catch(() => undefined);
    }
  }

  async close(): Promise<void> {
    const ds = this.ds;
    this.ds = null;
    this.pending = null;
    if (ds?.isInitialized) await ds.destroy().catch(() => undefined);
  }
}
