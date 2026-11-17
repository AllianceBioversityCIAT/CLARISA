import { env } from 'process';

/**
 * Control lists switches and connections. Read on every access (like
 * `GlobalConceptsConfig`), so tests can change them without reloading.
 *
 * Off by default: the lists schema and its two database users do not exist
 * yet in any environment. Switched off, every route answers 404 and the
 * module never opens a connection.
 */
export const ControlListsConfig = {
  get enabled(): boolean {
    return (env.CONTROL_LISTS_ENABLED ?? 'false').toLowerCase() === 'true';
  },
  /** Schema where the tables created by users live. Never the main schema. */
  get schema(): string {
    return env.CONTROL_LISTS_DB_NAME ?? 'clarisa_control_lists';
  },
  get host(): string | undefined {
    return env.CONTROL_LISTS_DB_HOST ?? env.DB_HOST;
  },
  get port(): number {
    return parseInt(env.CONTROL_LISTS_DB_PORT ?? env.DB_PORT ?? '3306', 10);
  },
  /** Engine user: CREATE, ALTER, DROP, INDEX, REFERENCES + DML, only on `schema`. */
  get engineUser(): string | undefined {
    return env.CONTROL_LISTS_DB_USER;
  },
  get enginePass(): string | undefined {
    return env.CONTROL_LISTS_DB_PASS;
  },
  /** Data user: SELECT, INSERT, UPDATE, DELETE only on `schema`. No DDL. */
  get dataUser(): string | undefined {
    return env.CONTROL_LISTS_DATA_DB_USER;
  },
  get dataPass(): string | undefined {
    return env.CONTROL_LISTS_DATA_DB_PASS;
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
