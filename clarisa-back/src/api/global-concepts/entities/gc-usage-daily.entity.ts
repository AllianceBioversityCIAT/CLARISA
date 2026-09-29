import { Column, Entity, PrimaryColumn } from 'typeorm';

/** What a usage counter counts (checklist row 10). */
export enum GcUsageKind {
  SEARCH = 'search',
  ZERO_SEARCH = 'zero_search',
  VIEW = 'view',
  EXPORT = 'export',
  MCP = 'mcp',
  SUGGEST = 'suggest',
  API = 'api',
}

/**
 * Aggregated usage per day: one row per (day, scheme, kind, item), bumped by
 * an atomic upsert. Only aggregates are kept — never who asked, never an IP,
 * and never the text sent to "Check a text" or to MCP (their item is fixed).
 */
@Entity('gc_usage_daily')
export class GcUsageDaily {
  /** `YYYY-MM-DD`, UTC. */
  @PrimaryColumn({ type: 'date' })
  day: string;

  @PrimaryColumn({ type: 'bigint' })
  scheme_id: number;

  @PrimaryColumn({ type: 'varchar', length: 20 })
  kind: GcUsageKind;

  /** Normalised search, term_id, export format or tool name (≤191: utf8mb4 index limit). */
  @PrimaryColumn({ type: 'varchar', length: 191 })
  item: string;

  @Column({ type: 'int', default: 0 })
  count: number;
}
