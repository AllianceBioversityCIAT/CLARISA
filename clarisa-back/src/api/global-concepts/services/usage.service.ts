import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In, MoreThanOrEqual } from 'typeorm';
import { GcConcept } from '../entities/gc-concept.entity';
import { GcUsageDaily, GcUsageKind } from '../entities/gc-usage-daily.entity';
import { ConceptGraphLoader } from './concept-graph.loader';

const MAX_ITEM = 100;
const MAX_DAYS = 365;
const TOP = 20;

/** Search text as stored: trimmed, lower-case, spaces collapsed, ≤100 characters. */
export const normaliseSearch = (q: unknown): string =>
  typeof q === 'string'
    ? q.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, MAX_ITEM).trim()
    : '';

const today = () => new Date().toISOString().slice(0, 10);
const dayOf = (v: string | Date) =>
  typeof v === 'string' ? v.slice(0, 10) : v.toISOString().slice(0, 10);

/**
 * Usage analytics of the public surfaces (contract v2 §3; checklist row 10:
 * "which terms are searched for and used"). Counts only, per day, per scheme:
 * no person, no IP. What someone types in the public search box is kept,
 * normalised; a text sent to "Check a text" or through MCP never is — those
 * are counted under a fixed item.
 *
 * Recording is fire-and-forget on purpose: the public read must never fail
 * nor wait because a counter could not be written. `record` returns before
 * the database answers and swallows (and logs) any error.
 */
@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly loader: ConceptGraphLoader,
  ) {}

  /**
   * Bumps one counter. One atomic statement: the scheme id is resolved inside
   * the INSERT (an unknown scheme inserts nothing), and concurrent hits on
   * the same (day, scheme, kind, item) add up instead of losing one another.
   */
  record(scheme: string, kind: GcUsageKind, item: string | number): void {
    const text = String(item ?? '').slice(0, MAX_ITEM);
    if (!text) return;
    try {
      void this.dataSource
        .query(
          `INSERT INTO gc_usage_daily (\`day\`, scheme_id, kind, item, \`count\`)
           SELECT ?, s.id, ?, ?, 1 FROM gc_schemes s WHERE s.code = ?
           ON DUPLICATE KEY UPDATE \`count\` = gc_usage_daily.\`count\` + 1`,
          [today(), kind, text, (scheme ?? '').toLowerCase()],
        )
        .catch((err) => this.fail(err));
    } catch (err) {
      this.fail(err);
    }
  }

  /** The public list: a search (and a zero-result search), or a plain listing. */
  recordList(scheme: string, q: unknown, results: number): void {
    const item = normaliseSearch(q);
    if (!item) {
      this.record(scheme, GcUsageKind.API, 'list');
      return;
    }
    this.record(scheme, GcUsageKind.SEARCH, item);
    if (!results) this.record(scheme, GcUsageKind.ZERO_SEARCH, item);
  }

  /** Admin summary of the last `days` days, today included. */
  async summary(code: string, days = 30) {
    const span = Math.min(
      Math.max(Math.trunc(Number(days)) || 30, 1),
      MAX_DAYS,
    );
    const manager = this.dataSource.manager;
    const scheme = await this.loader.scheme(manager, code);
    const since = new Date(Date.now() - (span - 1) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const rows = await manager.find(GcUsageDaily, {
      where: { scheme_id: scheme.id, day: MoreThanOrEqual(since) },
    });

    const totals = {
      search: 0,
      zero_search: 0,
      view: 0,
      export: 0,
      mcp: 0,
      suggest: 0,
    };
    const byDay = new Map<
      string,
      { day: string; search: number; view: number }
    >();
    for (let i = 0; i < span; i++) {
      const d = new Date(Date.parse(`${since}T00:00:00Z`) + i * 86_400_000)
        .toISOString()
        .slice(0, 10);
      byDay.set(d, { day: d, search: 0, view: 0 });
    }
    const tally = new Map<GcUsageKind, Map<string, number>>();
    for (const r of rows) {
      const n = Number(r.count) || 0;
      if (r.kind in totals) totals[r.kind as keyof typeof totals] += n;
      const slot = byDay.get(dayOf(r.day));
      if (slot && r.kind === GcUsageKind.SEARCH) slot.search += n;
      if (slot && r.kind === GcUsageKind.VIEW) slot.view += n;
      const m = tally.get(r.kind) ?? new Map<string, number>();
      m.set(r.item, (m.get(r.item) ?? 0) + n);
      tally.set(r.kind, m);
    }
    const top = (kind: GcUsageKind) =>
      [...(tally.get(kind) ?? new Map<string, number>()).entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, TOP)
        .map(([item, count]) => ({ item, count }));

    const viewed = top(GcUsageKind.VIEW);
    const termIds = viewed
      .map((v) => Number(v.item))
      .filter((n) => Number.isInteger(n) && n > 0);
    const concepts = termIds.length
      ? await manager.find(GcConcept, {
          where: { scheme_id: scheme.id, term_id: In(termIds) },
        })
      : [];
    const label = new Map(
      concepts.map((c) => [Number(c.term_id), c.preferred_label]),
    );
    return {
      days: span,
      totals,
      by_day: [...byDay.values()],
      top_searches: top(GcUsageKind.SEARCH),
      zero_result_searches: top(GcUsageKind.ZERO_SEARCH),
      top_viewed: viewed.map((v) => ({
        term_id: Number(v.item),
        preferred_label: label.get(Number(v.item)) ?? null,
        count: v.count,
      })),
    };
  }

  private fail(err: unknown) {
    this.logger.warn(
      `Usage not recorded: ${(err as Error)?.message ?? String(err)}`,
    );
  }
}
