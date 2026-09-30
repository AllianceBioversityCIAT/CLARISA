import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ApiKeyUsageMetricsService } from '../../api-key/api-key-usage-metrics.service';
import { OverviewSystemDto } from '../../api-key/dto/usage-metrics.dto';
import { ConceptGraphLoader } from './concept-graph.loader';
import { CountedReads, UsageService } from './usage.service';

/**
 * Every path a platform reaches MELIAF Taxonomy through: the module itself
 * (public reads, MCP and `platform/*`) and the persistent URIs.
 */
export const MELIAF_TAXONOMY_ENDPOINT_PREFIXES = [
  '/api/meliaf-taxonomy/',
  '/concepts/',
];

const isoDay = (ms: number) =>
  Number.isNaN(ms) ? '' : new Date(ms).toISOString().slice(0, 10);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v: unknown) =>
  DAY.test(String(v)) &&
  isoDay(Date.parse(`${String(v)}T00:00:00Z`) || NaN) === String(v);
const MAX_DAYS = 365;

export interface PlatformUsage {
  /** The platforms' key log carries no scheme: both sides cover every scheme. */
  scope: 'all-schemes';
  /** Inclusive UTC days. */
  from: string;
  to: string;
  endpoint_prefixes: string[];
  /** One row per connected system (MIS) that called with its API key. */
  systems: OverviewSystemDto[];
  /** Sum of `systems[].calls`. */
  platform_calls: number;
  /**
   * The module's own counters (`gc_usage_daily`): counted reads in total,
   * those made with a key and the anonymous rest (`total = keyed + anonymous`).
   */
  counted_reads: CountedReads;
}

/**
 * "By platform" in the MELIAF admin Usage tab (Héctor, 2026-09-30: review the
 * use of the platforms connected to the endpoint, not only the search portal).
 * Reuses the Microservices Overview aggregate, narrowed by endpoint prefix.
 */
@Injectable()
export class PlatformUsageService {
  constructor(
    private readonly metrics: ApiKeyUsageMetricsService,
    private readonly usage: UsageService,
    private readonly loader: ConceptGraphLoader,
    private readonly dataSource: DataSource,
  ) {}

  async byPlatform(
    scheme: string,
    query: { from?: string; to?: string; days?: string | number } = {},
  ): Promise<PlatformUsage> {
    await this.loader.scheme(this.dataSource.manager, scheme); // 404 when unknown
    const { from, to } = this.period(query);
    const [platforms, counted_reads] = await Promise.all([
      // Parsed as local days, the way `resolveUsageDateRange` bounds them.
      this.metrics.getSystemsForEndpoints(
        { from: `${from}T00:00:00`, to: `${to}T00:00:00` },
        MELIAF_TAXONOMY_ENDPOINT_PREFIXES,
      ),
      this.usage.countedReads(from, to),
    ]);
    const systems = platforms.systems;
    return {
      scope: 'all-schemes',
      from,
      to,
      endpoint_prefixes: [...MELIAF_TAXONOMY_ENDPOINT_PREFIXES],
      systems,
      platform_calls: systems.reduce((sum, s) => sum + s.calls, 0),
      counted_reads,
    };
  }

  /** `from`/`to` (YYYY-MM-DD) win; otherwise the last `days` days, today included. */
  private period(query: {
    from?: string;
    to?: string;
    days?: string | number;
  }): { from: string; to: string } {
    const today = isoDay(Date.now());
    if (query.from !== undefined || query.to !== undefined) {
      const from = query.from ?? query.to;
      const to = query.to ?? today;
      if (!isDay(from) || !isDay(to)) {
        throw new BadRequestException('from and to must be YYYY-MM-DD');
      }
      if (from > to) throw new BadRequestException('from must not be after to');
      return { from, to };
    }
    const span = Math.min(
      Math.max(Math.trunc(Number(query.days ?? 30)) || 30, 1),
      MAX_DAYS,
    );
    return { from: isoDay(Date.now() - (span - 1) * 86_400_000), to: today };
  }
}
