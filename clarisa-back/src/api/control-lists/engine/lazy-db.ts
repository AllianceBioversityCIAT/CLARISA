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
 * A connection that opens on first use, not at boot.
 *
 * A second datasource registered with `TypeOrmModule.forRoot` fails module
 * initialisation when its schema or user is missing, and that stops the whole
 * API before `listen()`. Here a failure only makes this module answer 503.
 *
 * Every connection handed out comes with the strict `sql_mode` already set,
 * because a plain `query()` may land on any connection of the pool.
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
      await qr.query(`SET SESSION sql_mode = '${STRICT_SQL_MODE}'`);
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
