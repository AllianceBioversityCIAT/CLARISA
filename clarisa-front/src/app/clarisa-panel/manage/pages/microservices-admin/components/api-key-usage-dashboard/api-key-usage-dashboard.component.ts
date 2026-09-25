import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  ApiKeyUsageStats,
  EndpointUsagePage,
  ManageApiService,
  UsageLogsPage,
  UsageOverview,
  UsageQueryParams
} from '../../../../services/manage-api.service';
import { NO_SYSTEM_COLOR, paletteColor } from '../../utils/chart-geometry';
import { buildUsageTree, Catalog, filterUsageTree, matchCatalogRoute, UsageTreeEndpoint, UsageTreeGroup } from '../../utils/endpoint-catalog';
import { absoluteTime, relativeTime } from '../../utils/relative-time';
import { ChartSeries } from '../charts/usage-chart.component';
import { FlowLink, FlowNode } from '../charts/flow-chart.component';
import { PickerSystem } from '../system-picker/system-picker.component';

export type RangePreset = '7d' | '30d' | '90d' | '12m' | 'custom';
export type ChartMetric = 'calls' | 'errors' | 'latency';

/** Up to this many days the charts are daily; above it, weekly. */
const DAILY_UP_TO_DAYS = 45;
/** How many systems the Overview opens with, busiest first. */
const DEFAULT_SYSTEMS = 6;
/** How many endpoints the flow chart shows before «Other». */
const TOP_ENDPOINTS = 6;
const SUCCESS_TARGET = 99;
const SLOW_MS = 400;
const IDLE_DAYS = 60;

export interface SystemRow {
  /** MIS id, `0` for keys with no MIS */
  id: number;
  acronym: string;
  label: string;
  name: string;
  environment: string | null;
  color: string;
  calls: number;
  errors: number;
  avgMs: number | null;
  keys: number;
  lastUsedAt: string | null;
}

export interface Kpi {
  label: string;
  value: string;
  delta: { text: string; tone: 'good' | 'bad' | 'flat' } | null;
  caption: string;
  spark: number[] | null;
  color: string;
  unit?: string;
  chips?: { label: string; value: number }[];
}

interface KeyRecord {
  id: number;
  name: string;
  key_prefix: string;
  mis_id?: number | null;
  mis_acronym?: string;
  environment?: string;
  description?: string | null;
  is_active: boolean;
  expires_at?: string | null;
  last_used_at?: string | null;
}

export interface AttentionItem {
  tone: 'warn' | 'bad' | 'info';
  icon: string;
  title: string;
  text: string;
  action: string;
  section: 'api-keys' | 'mises';
}

/**
 * Overview de «Microservices & API keys», rehecho sobre el mockup que Yeck
 * aprobó el 25-sep-2026 («desarróllalo tal cual»): un filtro general de fechas
 * y sistemas arriba, cada tarjeta dice qué mide, cómo se lee y qué concluir,
 * y cada sistema lleva el mismo color en todas las gráficas.
 *
 * Todo sale de `usage/overview` desglosado por sistema, así que prender o
 * apagar un sistema no vuelve a pedir nada al servidor; solo el registro de
 * llamadas se vuelve a pedir, porque va paginado.
 */
@Component({
  selector: 'app-api-key-usage-dashboard',
  templateUrl: './api-key-usage-dashboard.component.html',
  styleUrls: ['./api-key-usage-dashboard.component.scss']
})
export class ApiKeyUsageDashboardComponent implements OnInit, OnDestroy {
  readonly rangeOptions: { value: RangePreset; label: string }[] = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: '12m', label: '12 months' },
    { value: 'custom', label: 'Custom' }
  ];
  readonly successTarget = SUCCESS_TARGET;
  readonly slowMs = SLOW_MS;
  readonly weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly hours = Array.from({ length: 24 }, (_, h) => h);

  rangePreset: RangePreset = '30d';
  customFrom: Date | null = null;
  customTo: Date | null = null;
  compare = true;
  metric: ChartMetric = 'calls';

  loading = false;
  overview: UsageOverview | null = null;
  previous: UsageOverview | null = null;
  year: UsageOverview | null = null;
  endpointUsage: EndpointUsagePage | null = null;
  endpointsUnavailable = false;
  logs: UsageLogsPage | null = null;
  latest: UsageLogsPage | null = null;
  logsLoading = false;
  keys: KeyRecord[] = [];
  registered: { id: number; acronym: string; name: string; environment: string | null }[] = [];
  catalog: Catalog | null = null;

  /** Every system the picker offers: the ones with calls first, then the rest of the registry. */
  systems: SystemRow[] = [];
  selected: number[] = [];
  private selectionTouched = false;

  // derived, rebuilt on every change of data, period or selection
  kpis: Kpi[] = [];
  sparkLabels: string[] = [];
  chartLabels: string[] = [];
  chartSeries: ChartSeries[] = [];
  weekly = false;
  bySystem: (SystemRow & { share: number; width: number })[] = [];
  flowLeft: FlowNode[] = [];
  flowRight: FlowNode[] = [];
  flowLinks: FlowLink[] = [];
  flowFocus: string | null = null;
  topEndpoints: {
    key: string;
    route: string;
    method: string;
    total: number;
    width: number;
    parts: { color: string; label: string; value: number; share: number }[];
  }[] = [];
  heat: { value: number; shade: string; title: string }[][] = [];
  heatPeak = '';
  heatQuiet = '';
  ranking: (SystemRow & { move: number; trend: number[] })[] = [];
  health: (SystemRow & { rate: number; status: 'ok' | 'slow' | 'watch' | 'bad'; barWidth: number })[] = [];
  attention: AttentionItem[] = [];
  calendar: ({ date: string; value: number; tone: string } | null)[] = [];
  calendarMonths: string[] = [];
  readonly calendarTones = ['#f4f4f5', '#d1f0e4', '#9fdcc5', '#5cbf9c', '#1f9170', '#0b5f45'];
  calendarActiveDays = 0;
  calendarBusiest: { date: string; value: number } | null = null;
  totals = { calls: 0, prevCalls: 0, errors: 0 };

  /** Endpoint explorer, hung from the public documentation tree. */
  tree: UsageTreeGroup[] = [];
  visibleTree: UsageTreeGroup[] = [];
  endpointQuery = '';
  selectedEndpoint: UsageTreeEndpoint | null = null;
  openGroups = new Set<string>();
  private endpointPickedByUser = false;

  /** Activity log, paged on the server. */
  logsFirst = 0;
  logsRows = 25;
  readonly logsRowsOptions = [25, 50, 100];

  /** A key picked from «API Keys → Open in Overview». */
  filterApiKeyId: number | null = null;
  keyDetail: ApiKeyUsageStats | null = null;
  keyDetailSeries: ChartSeries[] = [];
  keyDetailLabels: string[] = [];

  private queryParamsSub?: Subscription;
  private loadSub?: Subscription;

  constructor(
    private api: ManageApiService,
    private messages: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.api.getApiReferenceCatalog().subscribe({
      next: catalog => {
        this.catalog = catalog as Catalog;
        this.rebuildTree();
      },
      error: () => {
        this.catalog = null;
        this.rebuildTree();
      }
    });
    this.api.getAllMis().subscribe({
      next: (resp: any) => {
        const list = Array.isArray(resp) ? resp : [];
        this.registered = list.map((m: any) => ({
          id: Number(m.id),
          acronym: m.acronym,
          name: m.name,
          environment: m.environment ?? m.environment_object?.acronym ?? null
        }));
        this.rebuild();
      }
    });
    this.api.getAllApiKeys('all').subscribe({
      next: (resp: any) => {
        this.keys = Array.isArray(resp) ? resp : [];
        this.rebuild();
      }
    });

    // «Open in Overview» from the API Keys tab arrives as `?api_key=`.
    this.queryParamsSub = this.route.queryParamMap.subscribe(params => {
      const id = Number(params.get('api_key'));
      this.filterApiKeyId = id > 0 ? id : null;
      if (this.filterApiKeyId) {
        this.loadKeyDetail(this.filterApiKeyId);
      } else {
        this.keyDetail = null;
      }
    });
    this.reload();
  }

  ngOnDestroy(): void {
    this.queryParamsSub?.unsubscribe();
    this.loadSub?.unsubscribe();
  }

  // ------------------------------------------------------------ period

  get periodLabel(): string {
    const r = this.resolveRange();
    return `${this.longDay(r.from)} – ${this.longDay(r.to)}`;
  }

  get previousLabel(): string {
    const p = this.previousRange();
    return `${this.longDay(p.from)} – ${this.longDay(p.to)}`;
  }

  setRange(preset: RangePreset): void {
    this.rangePreset = preset;
    if (preset === 'custom') {
      if (!this.customFrom || !this.customTo) {
        const r = this.resolveRange();
        this.customFrom = r.from;
        this.customTo = r.to;
      }
      return;
    }
    this.reload();
  }

  applyCustomRange(): void {
    if (!this.customFrom || !this.customTo) {
      return;
    }
    if (this.customFrom > this.customTo) {
      this.messages.add({ severity: 'warn', summary: 'Period', detail: '«From» must be before «To».' });
      return;
    }
    this.reload();
  }

  toggleCompare(): void {
    this.compare = !this.compare;
    this.rebuild();
  }

  refresh(): void {
    this.reload();
  }

  // ------------------------------------------------------------ systems

  get pickerSystems(): PickerSystem[] {
    return this.systems.map(s => ({
      id: s.id,
      label: s.label,
      sub: s.name + (s.environment ? ` · ${s.environment}` : ''),
      color: s.color,
      calls: s.calls
    }));
  }

  get selectedSystems(): SystemRow[] {
    return this.systems.filter(s => this.selected.includes(s.id));
  }

  onSelectionChange(ids: number[]): void {
    this.selectionTouched = true;
    this.selected = ids;
    this.rebuild();
    this.logsFirst = 0;
    this.loadLogs();
    this.loadLatest();
  }

  removeSystem(id: number): void {
    if (this.selected.length > 1) {
      this.onSelectionChange(this.selected.filter(x => x !== id));
    }
  }

  setMetric(metric: ChartMetric): void {
    this.metric = metric;
    this.buildChart();
  }

  // ------------------------------------------------------------ endpoint explorer

  onEndpointQuery(value: string): void {
    this.endpointQuery = value;
    this.visibleTree = filterUsageTree(this.tree, value);
    if (value.trim()) {
      this.visibleTree.forEach(group => this.openGroups.add(group.name));
    }
    if (this.selectedEndpoint && !this.findEndpoint(this.visibleTree, this.selectedEndpoint.key)) {
      this.selectedEndpoint = this.visibleTree[0]?.categories[0]?.endpoints[0] ?? null;
    }
  }

  toggleGroup(group: UsageTreeGroup): void {
    if (this.openGroups.has(group.name)) {
      this.openGroups.delete(group.name);
    } else {
      this.openGroups.add(group.name);
    }
  }

  isGroupOpen(group: UsageTreeGroup): boolean {
    return this.openGroups.has(group.name);
  }

  selectEndpoint(endpoint: UsageTreeEndpoint): void {
    this.selectedEndpoint = endpoint;
    this.endpointPickedByUser = true;
  }

  endpointShare(endpoint: UsageTreeEndpoint): number {
    const total = this.tree.reduce((a, g) => a + g.total_requests, 0);
    return total ? Math.round((endpoint.total_requests / total) * 1000) / 10 : 0;
  }

  consumerShare(requests: number): number {
    const total = this.selectedEndpoint?.total_requests ?? 0;
    return total ? Math.round((requests / total) * 1000) / 10 : 0;
  }

  // ------------------------------------------------------------ activity log

  onLogsLazy(event: { first?: number; rows?: number }): void {
    this.logsFirst = event.first ?? 0;
    this.logsRows = event.rows ?? this.logsRows;
    this.loadLogs();
  }

  exportLogsCsv(): void {
    if (!this.logs?.items?.length) {
      return;
    }
    const header = ['created_at', 'mis', 'api_key', 'microservice', 'endpoint', 'method', 'status', 'response_ms', 'ip'];
    const rows = this.logs.items.map(row => [
      row.created_at,
      row.mis_acronym ?? '',
      row.key_prefix,
      row.microservice_name,
      row.endpoint_accessed,
      row.http_method ?? '',
      row.status_code ?? '',
      row.response_time_ms ?? '',
      row.ip_address ?? ''
    ]);
    const csv = [header, ...rows].map(line => line.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `api-key-usage-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // ------------------------------------------------------------ navigation

  goTo(section: 'api-keys' | 'mises'): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { section, api_key: null }, queryParamsHandling: 'merge' });
  }

  clearKeyDetail(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { api_key: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  // ------------------------------------------------------------ presentation helpers

  fmt(value: number | null | undefined): string {
    return value == null ? '—' : Math.round(value).toLocaleString('en-US');
  }

  ms(value: number | null | undefined): string {
    return value == null ? '—' : `${Math.round(value).toLocaleString('en-US')} ms`;
  }

  ago(value: string | null | undefined): string {
    return relativeTime(value);
  }

  exact(value: string | null | undefined): string {
    return absoluteTime(value);
  }

  time(value: string): string {
    return new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  systemColor(misAcronym: string | null | undefined): string {
    return this.systems.find(s => s.acronym === misAcronym)?.color ?? NO_SYSTEM_COLOR;
  }

  statusLabel(status: string): string {
    return ({ ok: 'Healthy', slow: 'Slow', watch: 'Some errors', bad: 'Many errors' } as Record<string, string>)[status] ?? status;
  }

  get flowFoot(): string {
    if (this.flowFocus) {
      const mine = this.flowLinks.filter(l => l.from === this.flowFocus).sort((a, b) => b.value - a.value);
      const total = mine.reduce((a, l) => a + l.value, 0);
      const system = this.flowLeft.find(n => n.key === this.flowFocus)?.label ?? '';
      const target = this.flowRight.find(n => n.key === mine[0]?.to)?.label ?? '';
      return mine.length && total ? `${system} sends ${Math.round((mine[0].value / total) * 100)}% of its calls to ${target}` : '';
    }
    const top = this.flowRight[0];
    return top ? `${top.label} is the most requested endpoint · hover a system to follow only its calls` : '';
  }

  get rankingFoot(): string {
    if (!this.previous) {
      return 'No previous period to compare with';
    }
    const up = this.ranking.find(r => r.move > 0);
    return up ? `${up.label} moved up to #${this.ranking.indexOf(up) + 1}` : 'Same order as the previous period';
  }

  // ------------------------------------------------------------ loading

  private reload(): void {
    this.loading = true;
    const current = this.params(this.resolveRange());
    const prev = this.params(this.previousRange());
    const yearTo = new Date();
    const yearFrom = new Date(yearTo.getTime() - 364 * 86_400_000);
    this.loadSub?.unsubscribe();
    this.loadSub = forkJoin({
      overview: this.api.getApiKeyUsageOverview(current),
      previous: this.api.getApiKeyUsageOverview(prev).pipe(catchError(() => of(null))),
      year: this.year
        ? of(this.year)
        : this.api
            .getApiKeyUsageOverview({ from: this.startOfDay(yearFrom).toISOString(), to: this.endOfDay(yearTo).toISOString(), granularity: 'day' })
            .pipe(catchError(() => of(null))),
      endpoints: this.api.getApiKeyUsageByEndpoint(current).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ overview, previous, year, endpoints }) => {
        this.overview = overview;
        this.previous = previous;
        this.year = year;
        this.endpointUsage = endpoints;
        this.endpointsUnavailable = !endpoints;
        this.loading = false;
        this.rebuild();
        this.logsFirst = 0;
        this.loadLogs();
        this.loadLatest();
        if (this.filterApiKeyId) {
          this.loadKeyDetail(this.filterApiKeyId);
        }
      },
      error: err => {
        this.loading = false;
        this.toastError(err);
      }
    });
  }

  private loadLogs(): void {
    this.logsLoading = true;
    this.api
      .getApiKeyUsageLogs({ ...this.params(this.resolveRange()), ...this.systemFilter(), limit: this.logsRows, offset: this.logsFirst })
      .subscribe({
        next: resp => {
          this.logs = resp;
          this.logsLoading = false;
        },
        error: err => {
          this.logsLoading = false;
          this.toastError(err);
        }
      });
  }

  private loadLatest(): void {
    this.api.getApiKeyUsageLogs({ ...this.params(this.resolveRange()), ...this.systemFilter(), limit: 8, offset: 0 }).subscribe({
      next: resp => (this.latest = resp),
      error: () => (this.latest = null)
    });
  }

  private loadKeyDetail(id: number): void {
    this.api.getApiKeyUsage(id, this.params(this.resolveRange())).subscribe({
      next: resp => {
        this.keyDetail = resp;
        this.keyDetailLabels = resp.time_series.map(p => p.date);
        this.keyDetailSeries = [{ key: 'calls', label: 'Calls', color: '#0b7554', values: resp.time_series.map(p => p.count) }];
      },
      error: err => this.toastError(err)
    });
  }

  // ------------------------------------------------------------ derived data

  /** Recomputes everything drawn from the loaded data, the period and the selection. */
  rebuild(): void {
    if (!this.overview) {
      return;
    }
    this.buildSystems();
    this.buildKpis();
    this.buildChart();
    this.buildBySystem();
    this.buildFlows();
    this.buildHeatmap();
    this.buildRanking();
    this.buildHealth();
    this.buildAttention();
    this.buildCalendar();
    this.rebuildTree();
  }

  private buildSystems(): void {
    const ov = this.overview!;
    const acronymCount = new Map<string, number>();
    const add = (a: string) => acronymCount.set(a, (acronymCount.get(a) ?? 0) + 1);
    ov.systems.forEach(s => add(s.acronym));
    const withCalls = new Set(ov.systems.map(s => s.mis_id ?? 0));
    const silent = this.registered.filter(m => !withCalls.has(m.id));
    silent.forEach(m => add(m.acronym));
    const label = (acronym: string, env: string | null) => ((acronymCount.get(acronym) ?? 0) > 1 && env ? `${acronym} · ${env}` : acronym);

    let colorIndex = 0;
    const rows: SystemRow[] = ov.systems.map(s => {
      const id = s.mis_id ?? 0;
      return {
        id,
        acronym: s.acronym,
        label: label(s.acronym, s.environment),
        name: s.name,
        environment: s.environment,
        color: id === 0 ? NO_SYSTEM_COLOR : paletteColor(colorIndex++),
        calls: s.calls,
        errors: s.errors,
        avgMs: s.avg_response_time_ms,
        keys: s.api_keys,
        lastUsedAt: s.last_used_at
      };
    });
    [...silent]
      .sort((a, b) => a.acronym.localeCompare(b.acronym))
      .forEach(m =>
        rows.push({
          id: m.id,
          acronym: m.acronym,
          label: label(m.acronym, m.environment),
          name: m.name,
          environment: m.environment,
          color: paletteColor(colorIndex++),
          calls: 0,
          errors: 0,
          avgMs: null,
          keys: 0,
          lastUsedAt: null
        })
      );
    this.systems = rows;

    const known = new Set(rows.map(r => r.id));
    this.selected = this.selected.filter(id => known.has(id));
    if (!this.selectionTouched || !this.selected.length) {
      const busy = rows.filter(r => r.calls > 0).slice(0, DEFAULT_SYSTEMS);
      this.selected = (busy.length ? busy : rows.slice(0, DEFAULT_SYSTEMS)).map(r => r.id);
    }
  }

  private buildKpis(): void {
    const ov = this.overview!;
    const sel = new Set(this.selected);
    const inSel = (id: number | null) => sel.has(id ?? 0);
    const sumSys = (rows: UsageOverview['systems'] | undefined, key: 'calls' | 'errors') =>
      (rows ?? []).filter(s => inSel(s.mis_id)).reduce((a, s) => a + s[key], 0);
    const weighted = (rows: UsageOverview['systems'] | undefined) => {
      const list = (rows ?? []).filter(s => inSel(s.mis_id) && s.avg_response_time_ms != null);
      const n = list.reduce((a, s) => a + s.calls, 0);
      return n ? list.reduce((a, s) => a + (s.avg_response_time_ms ?? 0) * s.calls, 0) / n : null;
    };
    const calls = sumSys(ov.systems, 'calls');
    const errors = sumSys(ov.systems, 'errors');
    const prevCalls = sumSys(this.previous?.systems, 'calls');
    const prevErrors = sumSys(this.previous?.systems, 'errors');
    const errRate = calls ? (errors / calls) * 100 : 0;
    const prevErrRate = prevCalls ? (prevErrors / prevCalls) * 100 : 0;
    const avg = weighted(ov.systems);
    const prevAvg = weighted(this.previous?.systems);
    const consuming = ov.systems.filter(s => inSel(s.mis_id) && s.mis_id != null && s.calls > 0).length;
    const prevConsuming = (this.previous?.systems ?? []).filter(s => inSel(s.mis_id) && s.mis_id != null && s.calls > 0).length;
    this.totals = { calls, prevCalls, errors };

    const buckets = this.bucketList();
    this.sparkLabels = buckets;
    const series = ov.series.filter(p => inSel(p.mis_id));
    const sumBy = (field: 'calls' | 'errors') => {
      const map = new Map<string, number>();
      series.forEach(p => map.set(p.bucket, (map.get(p.bucket) ?? 0) + p[field]));
      return buckets.map(b => map.get(b) ?? 0);
    };
    const latency = buckets.map(b => {
      const pts = series.filter(p => p.bucket === b && p.avg_response_time_ms != null);
      const n = pts.reduce((a, p) => a + p.calls, 0);
      return n ? Math.round(pts.reduce((a, p) => a + (p.avg_response_time_ms ?? 0) * p.calls, 0) / n) : 0;
    });
    const systemsPerBucket = buckets.map(b => new Set(series.filter(p => p.bucket === b && p.mis_id != null && p.calls > 0).map(p => p.mis_id)).size);

    const now = Date.now();
    const keys = this.keys.filter(k => sel.has(k.mis_id ?? 0));
    const live = keys.filter(k => k.is_active && !(k.expires_at && new Date(k.expires_at).getTime() < now));
    const expiring = live.filter(k => k.expires_at && new Date(k.expires_at).getTime() - now < 30 * 86_400_000).length;
    const idle = live.filter(k => !k.last_used_at || now - new Date(k.last_used_at).getTime() > IDLE_DAYS * 86_400_000);
    const envChips = (list: KeyRecord[]) => {
      const m = new Map<string, number>();
      list.forEach(k => m.set(k.environment || '—', (m.get(k.environment || '—') ?? 0) + 1));
      return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([chip, value]) => ({ label: chip, value }));
    };
    const registeredCount = this.registered.length;
    const cmp = this.compare && !!this.previous;

    this.kpis = [
      {
        label: 'Calls',
        value: this.fmt(calls),
        delta: cmp ? this.delta(calls, prevCalls, false) : null,
        caption: 'Requests made with an API key in the period',
        spark: sumBy('calls'),
        color: '#0b7554'
      },
      {
        label: 'Systems consuming',
        value: this.fmt(consuming),
        delta: cmp ? this.deltaAbs(consuming, prevConsuming) : null,
        caption: registeredCount ? `of ${registeredCount} registered MIS called at least once` : 'Systems that called at least once',
        spark: systemsPerBucket,
        color: '#2563eb'
      },
      {
        label: 'Error rate',
        value: `${errRate.toFixed(2)}%`,
        delta: cmp ? this.deltaPoints(errRate, prevErrRate) : null,
        caption: `${this.fmt(errors)} calls answered with an error`,
        spark: sumBy('errors'),
        color: '#dc2626'
      },
      {
        label: 'Avg response time',
        value: this.ms(avg),
        delta: cmp && avg != null && prevAvg != null ? this.delta(avg, prevAvg, true) : null,
        caption: 'Average time CLARISA took to answer a call',
        spark: latency,
        color: '#7c3aed',
        unit: ' ms'
      },
      {
        label: 'Active keys',
        value: this.fmt(live.length),
        delta: null,
        caption: expiring ? `${expiring} expire in the next 30 days` : 'None expires in the next 30 days',
        spark: null,
        color: '#0d9488',
        chips: envChips(live)
      },
      {
        label: 'Idle keys',
        value: this.fmt(idle.length),
        delta: null,
        caption: `Active but no calls in ${IDLE_DAYS}+ days`,
        spark: null,
        color: '#f59e0b',
        chips: envChips(idle)
      }
    ];
  }

  buildChart(): void {
    if (!this.overview) {
      return;
    }
    const ov = this.overview;
    this.weekly = ov.granularity === 'week';
    const buckets = this.bucketList();
    this.chartLabels = buckets;
    this.chartSeries = this.selectedSystems
      .map(s => {
        const pts = new Map(ov.series.filter(p => (p.mis_id ?? 0) === s.id).map(p => [p.bucket, p]));
        const values = buckets.map(b => {
          const p = pts.get(b);
          if (!p) {
            return 0;
          }
          return this.metric === 'calls' ? p.calls : this.metric === 'errors' ? p.errors : (p.avg_response_time_ms ?? 0);
        });
        return { key: String(s.id), label: s.label, color: s.color, values };
      })
      .filter(s => s.values.some(v => v > 0));
  }

  private buildBySystem(): void {
    const rows = this.selectedSystems.filter(s => s.calls > 0).sort((a, b) => b.calls - a.calls);
    const total = rows.reduce((a, s) => a + s.calls, 0);
    const top = rows[0]?.calls || 1;
    this.bySystem = rows.map(s => ({ ...s, share: total ? (s.calls / total) * 100 : 0, width: (s.calls / top) * 100 }));
  }

  private buildFlows(): void {
    const sel = new Set(this.selected);
    const routes = this.catalogRoutes();
    const perEndpoint = new Map<string, { route: string; method: string; bySystem: Map<number, number> }>();
    for (const item of this.endpointUsage?.items ?? []) {
      const match = item.microservice_name === 'clarisa-api' ? matchCatalogRoute(item.endpoint, item.http_method, routes) : null;
      const route = match ? `/${match.route.replace(/^\/+/, '')}` : item.endpoint;
      const method = (item.http_method ?? '—').toUpperCase();
      const key = `${method} ${route}`;
      const entry = perEndpoint.get(key) ?? { route, method, bySystem: new Map<number, number>() };
      for (const c of item.consumers) {
        const id = c.mis_id ?? 0;
        if (sel.has(id)) {
          entry.bySystem.set(id, (entry.bySystem.get(id) ?? 0) + c.total_requests);
        }
      }
      perEndpoint.set(key, entry);
    }
    const ranked = [...perEndpoint.entries()]
      .map(([key, e]) => ({ key, ...e, total: [...e.bySystem.values()].reduce((a, v) => a + v, 0) }))
      .filter(e => e.total > 0)
      .sort((a, b) => b.total - a.total);

    const byId = new Map(this.systems.map(s => [s.id, s]));
    this.topEndpoints = ranked.slice(0, 8).map(e => ({
      key: e.key,
      route: e.route,
      method: e.method,
      total: e.total,
      width: ranked[0] ? (e.total / ranked[0].total) * 100 : 0,
      parts: [...e.bySystem.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id, v]) => ({
          color: byId.get(id)?.color ?? NO_SYSTEM_COLOR,
          label: byId.get(id)?.label ?? '—',
          value: v,
          share: (v / e.total) * 100
        }))
    }));

    const shown = ranked.slice(0, TOP_ENDPOINTS);
    const rest = ranked.slice(TOP_ENDPOINTS);
    const left = new Map<number, number>();
    const links: FlowLink[] = [];
    for (const e of shown) {
      e.bySystem.forEach((v, id) => {
        links.push({ from: String(id), to: e.key, value: v });
        left.set(id, (left.get(id) ?? 0) + v);
      });
    }
    if (rest.length) {
      const other = new Map<number, number>();
      rest.forEach(e => e.bySystem.forEach((v, id) => other.set(id, (other.get(id) ?? 0) + v)));
      other.forEach((v, id) => {
        links.push({ from: String(id), to: 'other', value: v });
        left.set(id, (left.get(id) ?? 0) + v);
      });
    }
    this.flowLeft = [...left.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => ({ key: String(id), label: byId.get(id)?.label ?? '—', color: byId.get(id)?.color ?? NO_SYSTEM_COLOR, value: v }));
    this.flowRight = [
      ...shown.map(e => ({ key: e.key, label: e.route, sub: e.method, color: '#d4d4d8', value: e.total })),
      ...(rest.length
        ? [
            {
              key: 'other',
              label: `${rest.length} other ${rest.length === 1 ? 'endpoint' : 'endpoints'}`,
              sub: '',
              color: '#e4e4e7',
              value: rest.reduce((a, e) => a + e.total, 0)
            }
          ]
        : [])
    ];
    this.flowLinks = links;
    if (this.flowFocus && !this.flowLeft.some(n => n.key === this.flowFocus)) {
      this.flowFocus = null;
    }
  }

  private buildHeatmap(): void {
    const sel = new Set(this.selected);
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const c of this.overview!.heatmap) {
      if (sel.has(c.mis_id ?? 0)) {
        grid[(c.day_of_week + 5) % 7][c.hour] += c.calls; // MySQL 1 = Sunday → row 6; 2 = Monday → row 0
      }
    }
    const max = Math.max(...grid.flat(), 0);
    this.heat = grid.map((row, d) =>
      row.map((v, h) => ({
        value: v,
        shade: max && v ? `color-mix(in oklab, #0b7554 ${Math.round(12 + (v / max) * 88)}%, #f4f4f5)` : '#f4f4f5',
        title: `${this.weekDays[d]} ${String(h).padStart(2, '0')}:00 · ${this.fmt(v)} calls`
      }))
    );
    const byHour = this.hours.map(h => grid.reduce((a, row) => a + row[h], 0));
    const peakHours = [...byHour.keys()]
      .filter(h => byHour[h] > 0)
      .sort((a, b) => byHour[b] - byHour[a])
      .slice(0, 2)
      .sort((a, b) => a - b);
    this.heatPeak = peakHours.map(h => `${String(h).padStart(2, '0')}:00`).join(' and ');
    const byDay = grid.map(row => row.reduce((a, v) => a + v, 0));
    this.heatQuiet = max ? this.weekDays[byDay.indexOf(Math.min(...byDay))] : '';
  }

  private buildRanking(): void {
    const sel = new Set(this.selected);
    const now = this.selectedSystems.filter(s => s.calls > 0).sort((a, b) => b.calls - a.calls);
    const before = (this.previous?.systems ?? [])
      .filter(s => sel.has(s.mis_id ?? 0) && s.calls > 0)
      .sort((a, b) => b.calls - a.calls)
      .map(s => s.mis_id ?? 0);
    const buckets = this.bucketList();
    this.ranking = now.map((s, i) => {
      const pts = new Map(this.overview!.series.filter(p => (p.mis_id ?? 0) === s.id).map(p => [p.bucket, p.calls]));
      const was = before.indexOf(s.id);
      return { ...s, move: was < 0 ? 0 : was - i, trend: buckets.map(b => pts.get(b) ?? 0) };
    });
  }

  private buildHealth(): void {
    this.health = this.selectedSystems
      .filter(s => s.calls > 0)
      .map(s => {
        const rate = 100 - (s.errors / s.calls) * 100;
        const status: 'ok' | 'slow' | 'watch' | 'bad' =
          rate < 97 ? 'bad' : rate < SUCCESS_TARGET ? 'watch' : (s.avgMs ?? 0) >= SLOW_MS ? 'slow' : 'ok';
        return { ...s, rate, status, barWidth: Math.max(0, Math.min(100, (rate - 90) * 10)) };
      })
      .sort((a, b) => a.rate - b.rate);
  }

  private buildAttention(): void {
    const now = Date.now();
    const sel = new Set(this.selected);
    const live = this.keys.filter(k => sel.has(k.mis_id ?? 0) && k.is_active && !(k.expires_at && new Date(k.expires_at).getTime() < now));
    const names = (list: KeyRecord[]) =>
      list
        .slice(0, 3)
        .map(k => `${k.name}${k.environment ? ` (${k.environment})` : ''}`)
        .join(' · ') + (list.length > 3 ? ` +${list.length - 3} more` : '');
    const items: AttentionItem[] = [];
    const expiring = live
      .filter(k => k.expires_at && new Date(k.expires_at).getTime() - now < 30 * 86_400_000)
      .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime());
    if (expiring.length) {
      items.push({
        tone: 'warn',
        icon: 'pi pi-clock',
        title: `${expiring.length} ${expiring.length === 1 ? 'key expires' : 'keys expire'} within 30 days`,
        text: expiring
          .slice(0, 3)
          .map(k => `${k.name} on ${new Date(k.expires_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
          .join(' · '),
        action: 'Review',
        section: 'api-keys'
      });
    }
    const idle = live.filter(k => !k.last_used_at || now - new Date(k.last_used_at).getTime() > IDLE_DAYS * 86_400_000);
    if (idle.length) {
      items.push({
        tone: 'info',
        icon: 'pi pi-moon',
        title: `${idle.length} active ${idle.length === 1 ? 'key has' : 'keys have'} no calls in ${IDLE_DAYS}+ days`,
        text: names(idle),
        action: 'Revoke?',
        section: 'api-keys'
      });
    }
    const undocumented = live.filter(k => !k.description?.trim());
    if (undocumented.length) {
      items.push({
        tone: 'warn',
        icon: 'pi pi-tag',
        title: `${undocumented.length} ${undocumented.length === 1 ? 'key has' : 'keys have'} no description`,
        text: 'Nobody can tell who holds them from the table alone',
        action: 'Describe',
        section: 'api-keys'
      });
    }
    const silent = this.systems.filter(s => s.id !== 0 && s.calls === 0);
    if (silent.length) {
      items.push({
        tone: 'info',
        icon: 'pi pi-volume-off',
        title: `${silent.length} registered ${silent.length === 1 ? 'system' : 'systems'} made no calls in the period`,
        text:
          silent
            .slice(0, 4)
            .map(s => s.label)
            .join(' · ') + (silent.length > 4 ? ` +${silent.length - 4} more` : ''),
        action: 'See registry',
        section: 'mises'
      });
    }
    this.attention = items;
  }

  private buildCalendar(): void {
    const sel = new Set(this.selected);
    const per = new Map<string, number>();
    (this.year?.series ?? []).filter(p => sel.has(p.mis_id ?? 0)).forEach(p => per.set(p.bucket, (per.get(p.bucket) ?? 0) + p.calls));
    const today = new Date();
    const days = Array.from({ length: 364 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (363 - i), 12);
      const iso = this.isoDay(d);
      return { date: iso, value: per.get(iso) ?? 0 };
    });
    const active = days
      .filter(d => d.value > 0)
      .map(d => d.value)
      .sort((a, b) => a - b);
    const q = (k: number) => active[Math.floor((active.length - 1) * k)] ?? 0;
    const cuts = [q(0.2), q(0.4), q(0.6), q(0.8)];
    const tone = (v: number) => (v <= 0 ? this.calendarTones[0] : this.calendarTones[1 + cuts.filter(c => v > c).length]);
    const pad = (new Date(`${days[0].date}T12:00:00`).getDay() + 6) % 7; // weeks start on Monday
    this.calendar = [...Array(pad).fill(null), ...days.map(d => ({ ...d, tone: tone(d.value) }))];
    const weeks = Math.ceil(this.calendar.length / 7);
    this.calendarMonths = Array.from({ length: weeks }, (_, w) => {
      const cell = this.calendar.slice(w * 7, w * 7 + 7).find(c => !!c);
      if (!cell) {
        return '';
      }
      const d = new Date(`${cell.date}T12:00:00`);
      return d.getDate() <= 7 ? d.toLocaleDateString('en-US', { month: 'short' }) : '';
    });
    this.calendarActiveDays = active.length;
    this.calendarBusiest = days.reduce<{ date: string; value: number } | null>((a, d) => (!a || d.value > a.value ? d : a), null);
  }

  private rebuildTree(): void {
    const sel = new Set(this.selected);
    const items = (this.endpointUsage?.items ?? [])
      .map(item => {
        const consumers = this.systems.length ? item.consumers.filter(c => sel.has(c.mis_id ?? 0)) : item.consumers;
        const total = consumers.reduce((a, c) => a + c.total_requests, 0);
        return {
          ...item,
          consumers,
          total_requests: total,
          unique_api_keys: consumers.length,
          error_count: item.total_requests ? Math.round((item.error_count * total) / item.total_requests) : 0
        };
      })
      .filter(item => item.total_requests > 0);
    this.tree = buildUsageTree(this.catalog, items);
    this.visibleTree = filterUsageTree(this.tree, this.endpointQuery);
    if (!this.endpointPickedByUser && this.endpointUsage) {
      this.openGroups.clear();
    }
    if (!this.openGroups.size && this.visibleTree.length) {
      const busiest = [...this.visibleTree].sort((a, b) => b.total_requests - a.total_requests)[0];
      this.openGroups.add(busiest.name);
    }
    const stillThere = this.endpointPickedByUser && this.selectedEndpoint ? this.findEndpoint(this.visibleTree, this.selectedEndpoint.key) : null;
    this.selectedEndpoint = stillThere ?? this.busiestEndpoint(this.visibleTree);
  }

  // ------------------------------------------------------------ internals

  private params(range: { from: Date; to: Date }): UsageQueryParams {
    const days = (range.to.getTime() - range.from.getTime()) / 86_400_000;
    return { from: range.from.toISOString(), to: range.to.toISOString(), granularity: days <= DAILY_UP_TO_DAYS ? 'day' : 'week' };
  }

  private systemFilter(): UsageQueryParams {
    const all = this.systems.length > 0 && this.selected.length >= this.systems.length;
    return all || !this.selected.length ? {} : { mis_ids: this.selected.join(',') };
  }

  private bucketList(): string[] {
    const ov = this.overview;
    if (!ov) {
      return [];
    }
    const from = new Date(ov.period.from);
    const to = new Date(ov.period.to);
    const out: string[] = [];
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12);
    if (ov.granularity === 'week') {
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    }
    const step = ov.granularity === 'week' ? 7 : 1;
    // Compared as dates, not instants: the cursor sits at noon, and before
    // noon `d <= to` dropped today's bucket from every chart.
    const last = this.isoDay(to);
    while (this.isoDay(d) <= last && out.length < 800) {
      out.push(this.isoDay(d));
      d.setDate(d.getDate() + step);
    }
    return out;
  }

  private catalogRoutes(): { route: string; method: string }[] {
    return (this.catalog?.groups ?? []).flatMap(g => g.categories.flatMap(c => c.endpoints.map(e => ({ route: e.route, method: e.method }))));
  }

  private delta(now: number, prev: number, lowerIsBetter: boolean): Kpi['delta'] {
    if (!prev) {
      return now ? { text: 'new', tone: lowerIsBetter ? 'bad' : 'good' } : { text: '— same', tone: 'flat' };
    }
    const d = ((now - prev) / prev) * 100;
    if (Math.abs(d) < 0.05) {
      return { text: '— same', tone: 'flat' };
    }
    const good = lowerIsBetter ? d < 0 : d > 0;
    return { text: `${d > 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}%`, tone: good ? 'good' : 'bad' };
  }

  private deltaAbs(now: number, prev: number): Kpi['delta'] {
    const d = now - prev;
    if (!d) {
      return { text: '— same', tone: 'flat' };
    }
    return { text: `${d > 0 ? '+' : ''}${d}`, tone: d > 0 ? 'good' : 'bad' };
  }

  /** Error rate moves in percentage points, not in percent of itself. */
  private deltaPoints(now: number, prev: number): Kpi['delta'] {
    const d = now - prev;
    if (Math.abs(d) < 0.01) {
      return { text: '— same', tone: 'flat' };
    }
    return { text: `${d > 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(2)} pts`, tone: d < 0 ? 'good' : 'bad' };
  }

  private resolveRange(): { from: Date; to: Date } {
    if (this.rangePreset === 'custom' && this.customFrom && this.customTo) {
      return { from: this.startOfDay(this.customFrom), to: this.endOfDay(this.customTo) };
    }
    const to = this.endOfDay(new Date());
    const days = this.rangePreset === '7d' ? 7 : this.rangePreset === '90d' ? 90 : this.rangePreset === '12m' ? 365 : 30;
    const from = new Date(to);
    from.setDate(from.getDate() - (days - 1));
    return { from: this.startOfDay(from), to };
  }

  private previousRange(): { from: Date; to: Date } {
    const r = this.resolveRange();
    const days = Math.round((r.to.getTime() - r.from.getTime()) / 86_400_000);
    const to = new Date(r.from);
    to.setDate(to.getDate() - 1);
    const from = new Date(to);
    from.setDate(from.getDate() - (days - 1));
    return { from: this.startOfDay(from), to: this.endOfDay(to) };
  }

  private findEndpoint(groups: UsageTreeGroup[], key: string): UsageTreeEndpoint | null {
    for (const group of groups) {
      for (const category of group.categories) {
        const hit = category.endpoints.find(e => e.key === key);
        if (hit) {
          return hit;
        }
      }
    }
    return null;
  }

  private busiestEndpoint(groups: UsageTreeGroup[]): UsageTreeEndpoint | null {
    let best: UsageTreeEndpoint | null = null;
    for (const group of groups) {
      for (const category of group.categories) {
        for (const endpoint of category.endpoints) {
          if (!best || endpoint.total_requests > best.total_requests) {
            best = endpoint;
          }
        }
      }
    }
    return best;
  }

  private isoDay(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private longDay(d: Date): string {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private toastError(err: any): void {
    const detail = err?.error?.message ?? err?.message ?? 'Failed to load usage metrics';
    this.messages.add({ severity: 'error', summary: 'Overview', detail });
  }
}
