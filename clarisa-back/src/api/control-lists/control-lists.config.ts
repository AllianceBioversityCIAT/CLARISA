import { env } from 'process';

/**
 * Control lists switches and connections. Read on every access (like
 * `GlobalConceptsConfig`), so tests can change them without reloading.
 *
 * Off by default. Switched off, every route answers 404 and the module never
 * opens a connection.
 *
 * The tables created by users live in CLARISA's own database unless
 * `CONTROL_LISTS_DB_NAME` names another one (infrastructure, 2026-11-17: one
 * database is one thing to migrate). User, password, host and port fall back
 * to CLARISA's `DB_*` the same way. Nothing outside the `cl_` tables of the
 * catalog is ever touched: `EngineService.qualified` refuses any other name.
 */
export const ControlListsConfig = {
  get enabled(): boolean {
    return (env.CONTROL_LISTS_ENABLED ?? 'false').toLowerCase() === 'true';
  },
  /** Database where the tables created by users live (default: CLARISA's). */
  get schema(): string {
    return env.CONTROL_LISTS_DB_NAME || env.DB_NAME || '';
  },
  get host(): string | undefined {
    return env.CONTROL_LISTS_DB_HOST || env.DB_HOST;
  },
  get port(): number {
    return parseInt(env.CONTROL_LISTS_DB_PORT || env.DB_PORT || '3306', 10);
  },
  /**
   * Engine user: needs CREATE, ALTER, DROP, INDEX, REFERENCES, LOCK TABLES +
   * DML on `schema`. Default: CLARISA's user (it already runs the migrations).
   */
  get engineUser(): string | undefined {
    return env.CONTROL_LISTS_DB_USER || env.DB_USER;
  },
  get enginePass(): string | undefined {
    return env.CONTROL_LISTS_DB_USER ? env.CONTROL_LISTS_DB_PASS : env.DB_PASS;
  },
  /** Data user: SELECT, INSERT, UPDATE, DELETE. Default: the engine user. */
  get dataUser(): string | undefined {
    return env.CONTROL_LISTS_DATA_DB_USER || this.engineUser;
  },
  get dataPass(): string | undefined {
    return env.CONTROL_LISTS_DATA_DB_USER
      ? env.CONTROL_LISTS_DATA_DB_PASS
      : this.enginePass;
  },
  /** How often the reconciler looks for half-done operations. */
  get reconcileEveryMs(): number {
    return (
      parseInt(env.CONTROL_LISTS_RECONCILE_EVERY_SECONDS ?? '60', 10) * 1000
    );
  },
  /**
   * An operation whose DDL did not land is only declared failed after this
   * long: when the connection drops, the server may still be running it.
   */
  get reconcileGraceSeconds(): number {
    return parseInt(env.CONTROL_LISTS_RECONCILE_GRACE_SECONDS ?? '120', 10);
  },
};
