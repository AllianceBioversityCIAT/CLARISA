import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import {
  ApiKeyUsageStats,
  EndpointUsagePage,
  ManageApiService,
  UsageLogsPage,
  UsageQueryParams,
  UsageSummary
} from '../../../../services/manage-api.service';
import { buildUsageTree, Catalog, filterUsageTree, UsageTreeEndpoint, UsageTreeGroup } from '../../utils/endpoint-catalog';
import { absoluteTime, relativeTime } from '../../utils/relative-time';

export type RangePreset = '7d' | '30d' | '90d' | '12m' | 'ytd' | 'all' | 'custom';

/** Where the log starts; nothing was recorded before the api_keys tables existed. */
const ALL_TIME_FROM = new Date('2020-01-01T00:00:00');

/** Up to this many days the timeline is daily; above it, weekly. */
const DAILY_UP_TO_DAYS = 45;

export interface ConsumerRow {
  mis_id: number | null;
  mis_acronym: string;
  mis_name: string;
  environment: string | null;
  total_requests: number;
  share: number;
  api_key_count: number;
  microservices_used: number;
  last_used_at: string | null;
  last_used_ts: number;
  search_text: string;
}

export interface KeyRow {
  id: number;
  name: string;
  key_prefix: string;
  mis_acronym: string | null;
  environment: string | null;
  usage_count: number;
  last_used_at: string | null;
  last_used_ts: number;
  requests_in_period: number;
  is_active: boolean;
  expires_at: string | null;
  status_label: string;
  search_text: string;
}

/**
 * La primera pantalla del módulo: responde de entrada quién consume CLARISA,
 * cuánto y cuándo (Héctor y el correo de Enrico, 24-sep-2026), y deja bajar
 * hasta un endpoint o una llave sin cambiar de pestaña.
 */
@Component({
  selector: 'app-api-key-usage-dashboard',
  templateUrl: './api-key-usage-dashboard.component.html',
  styleUrls: ['./api-key-usage-dashboard.component.scss']
})
export class ApiKeyUsageDashboardComponent implements OnInit, OnDestroy {
  loading = false;
  logsLoading = false;
  detailLoading = false;
  endpointsLoading = false;

  rangePreset: RangePreset = '30d';
  customFrom: Date | null = null;
  customTo: Date | null = null;

  summary: UsageSummary | null = null;
  keyDetail: ApiKeyUsageStats | null = null;
  logs: UsageLogsPage | null = null;

  consumers: ConsumerRow[] = [];
  keyRows: KeyRow[] = [];
  lastActivity: { at: string | null; key: string | null } = { at: null, key: null };

  filterMisId: number | null = null;
  filterApiKeyId: number | null = null;
  filterMicroservice: string | null = null;

  mises: { id: number; label: string }[] = [];
  apiKeyOptions: { id: number; label: string }[] = [];
  microserviceOptions: { value: string; label: string }[] = [];

  /** Endpoint explorer. */
  catalog: Catalog | null = null;
  endpointUsage: EndpointUsagePage | null = null;
  endpointsUnavailable = false;
  tree: UsageTreeGroup[] = [];
  visibleTree: UsageTreeGroup[] = [];
  endpointQuery = '';
  selectedEndpoint: UsageTreeEndpoint | null = null;
  openGroups = new Set<string>();
  /**
   * Solo se conserva la selección que eligió la persona. La que puso el
   * componente (el catálogo llega antes que el uso, y en ese instante el «más
   * usado» es el primero con 0) se recalcula cuando llegan los datos: si no,
   * el panel abría en «CGIAR entities · 0» con 34 llamadas en otra parte.
   */
  private endpointPickedByUser = false;

  /** Activity log, paged on the server. */
  logsFirst = 0;
  logsRows = 25;
  readonly logsRowsOptions = [25, 50, 100];
  readonly rowsPerPage = [10, 25, 50];

  timelineChart: any;
  microserviceChart: any;
  keyTimelineChart: any;
  keyMicroserviceChart: any;
  readonly lineOptions: any;
  readonly barOptions: any;

  readonly rangeOptions: { value: RangePreset; label: string }[] = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: '12m', label: '12 months' },
    { value: 'ytd', label: 'This year' },
    { value: 'all', label: 'All time' },
    { value: 'custom', label: 'Custom' }
  ];

  private readonly colors: { brand: string; brandSoft: string; ink3: string; line: string };
  private queryParamsSub?: Subscription;

  constructor(
    private api: ManageApiService,
    private messages: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Chart.js no lee CSS: los colores salen de los tokens del panel en
    // tiempo de ejecución, para no escribir un hex propio de esta pantalla.
    this.colors = {
      brand: this.token('--cl-brand-strong', 'seagreen'),
      brandSoft: this.token('--cl-brand-soft', 'honeydew'),
      ink3: this.token('--cl-ink-3', 'gray'),
      line: this.token('--cl-line', 'lightgray')
    };
    const grid = { color: this.colors.line, drawBorder: false };
    const ticks = { color: this.colors.ink3, font: { size: 11 } };
    this.lineOptions = {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false }, ticks }, y: { grid, ticks, beginAtZero: true } }
    };
    this.barOptions = {
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { grid, ticks, beginAtZero: true }, y: { grid: { display: false }, ticks } }
    };
  }

  ngOnInit(): void {
    this.api.getAllMis().subscribe({
      next: (resp: any) => {
        const list = Array.isArray(resp) ? resp : [];
        this.mises = list.map((mis: any) => ({
          id: mis.id,
          label: `${mis.acronym} — ${mis.name}`
        }));
      }
    });
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

    // «Open in Overview» desde la pestaña de llaves llega como `?api_key=`.
    this.queryParamsSub = this.route.queryParamMap.subscribe(params => {
      const id = Number(params.get('api_key'));
      if (id > 0 && id !== this.filterApiKeyId) {
        this.filterApiKeyId = id;
        this.reloadAll();
      }
    });
    if (!this.filterApiKeyId) {
      this.reloadAll();
    }
  }

  ngOnDestroy(): void {
    this.queryParamsSub?.unsubscribe();
  }

  // ------------------------------------------------------------ period

  get granularity(): 'day' | 'week' {
    const range = this.resolveRange();
    const days = (range.to.getTime() - range.from.getTime()) / 86_400_000;
    return days <= DAILY_UP_TO_DAYS ? 'day' : 'week';
  }

  get periodLabel(): string {
    const range = this.resolveRange();
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(range.from)} – ${fmt(range.to)}`;
  }

  get queryParams(): UsageQueryParams {
    const range = this.resolveRange();
    const params: UsageQueryParams = {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      granularity: this.granularity
    };
    if (this.filterMisId) params.mis_id = this.filterMisId;
    if (this.filterApiKeyId) params.api_key_id = this.filterApiKeyId;
    if (this.filterMicroservice) params.microservice_name = this.filterMicroservice;
    return params;
  }

  setRange(preset: RangePreset): void {
    this.rangePreset = preset;
    if (preset === 'custom') {
      if (!this.customFrom || !this.customTo) {
        const range = this.resolveRange();
        this.customFrom = range.from;
        this.customTo = range.to;
      }
      return;
    }
    this.reloadAll();
  }

  applyCustomRange(): void {
    if (!this.customFrom || !this.customTo) {
      return;
    }
    if (this.customFrom > this.customTo) {
      this.messages.add({ severity: 'warn', summary: 'Period', detail: '«From» must be before «To».' });
      return;
    }
    this.reloadAll();
  }

  onFiltersChange(): void {
    this.reloadAll();
  }

  clearFilters(): void {
    this.filterMisId = null;
    this.filterApiKeyId = null;
    this.filterMicroservice = null;
    this.keyDetail = null;
    this.dropApiKeyParam();
    this.reloadAll();
  }

  get hasFilters(): boolean {
    return !!(this.filterMisId || this.filterApiKeyId || this.filterMicroservice);
  }

  // ------------------------------------------------------------ drill-down

  toggleMis(row: ConsumerRow): void {
    if (row.mis_id == null) {
      return;
    }
    this.filterMisId = this.filterMisId === row.mis_id ? null : row.mis_id;
    this.reloadAll();
  }

  selectApiKey(id: number): void {
    this.filterApiKeyId = this.filterApiKeyId === id ? null : id;
    if (!this.filterApiKeyId) {
      this.keyDetail = null;
      this.dropApiKeyParam();
    }
    this.reloadAll();
  }

  clearKeyDetail(): void {
    this.filterApiKeyId = null;
    this.keyDetail = null;
    this.dropApiKeyParam();
    this.reloadAll();
  }

  refresh(): void {
    this.reloadAll();
  }

  // ------------------------------------------------------------ endpoint explorer

  onEndpointQuery(value: string): void {
    this.endpointQuery = value;
    this.visibleTree = filterUsageTree(this.tree, value);
    if (value.trim()) {
      this.visibleTree.forEach(group => this.openGroups.add(group.name));
    }
    if (this.selectedEndpoint && !this.isVisible(this.selectedEndpoint)) {
      this.selectedEndpoint = this.firstEndpoint(this.visibleTree);
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
    const total = this.endpointUsage?.total_requests ?? 0;
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

  // ------------------------------------------------------------ presentation

  formatNumber(value: number | null | undefined): string {
    if (value == null) return '—';
    return value.toLocaleString();
  }

  formatMs(value: number | null | undefined): string {
    if (value == null) return '—';
    return `${value} ms`;
  }

  formatDate(value: string | null | undefined): string {
    return absoluteTime(value);
  }

  ago(value: string | null | undefined): string {
    return relativeTime(value);
  }

  errorRate(): string {
    const total = this.summary?.totals.total_requests ?? 0;
    const errors = this.summary?.totals.error_count ?? 0;
    if (!total) return '0%';
    return `${((errors / total) * 100).toFixed(1)}%`;
  }

  get systemsCount(): number {
    return (this.summary?.by_mis ?? []).filter(m => m.mis_id != null).length;
  }

  get unassignedRequests(): number {
    return (this.summary?.by_mis ?? []).find(m => m.mis_id == null)?.total_requests ?? 0;
  }

  statusOf(key: { is_active: boolean; expires_at: string | null }): string {
    if (!key.is_active) return 'Revoked';
    if (key.expires_at && new Date(key.expires_at) < new Date()) return 'Expired';
    return 'Active';
  }

  statusSeverity(key: { is_active: boolean; expires_at: string | null }): string {
    const label = this.statusOf(key);
    return label === 'Revoked' ? 'danger' : label === 'Expired' ? 'warning' : 'success';
  }

  barWidth(percentage: number | null | undefined): string {
    return `${Math.max(0, Math.min(100, percentage ?? 0))}%`;
  }

  // ------------------------------------------------------------ loading

  private reloadAll(): void {
    this.loadDashboard();
    this.loadEndpoints();
    this.logsFirst = 0;
    this.loadLogs();
    if (this.filterApiKeyId) {
      this.loadKeyDetail(this.filterApiKeyId);
    }
  }

  private loadDashboard(): void {
    this.loading = true;
    this.api.getApiKeyUsageSummary(this.queryParams).subscribe({
      next: resp => {
        this.summary = resp;
        this.apiKeyOptions = (resp.keys ?? []).map(key => ({
          id: key.id,
          label: `${key.name} (${key.key_prefix}…)`
        }));
        // La llave preseleccionada puede no tener tráfico en el período:
        // igual tiene que poder verse en el selector para poder quitarla.
        if (this.filterApiKeyId && !this.apiKeyOptions.some(k => k.id === this.filterApiKeyId)) {
          this.apiKeyOptions = [{ id: this.filterApiKeyId, label: `Key #${this.filterApiKeyId}` }, ...this.apiKeyOptions];
        }
        this.microserviceOptions = (resp.by_microservice ?? []).map(ms => ({
          value: ms.microservice_name,
          label: ms.microservice_name
        }));
        this.consumers = this.buildConsumers(resp);
        this.keyRows = this.buildKeyRows(resp);
        this.lastActivity = this.findLastActivity(resp);
        this.buildSummaryCharts(resp);
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.toastError(err);
      }
    });
  }

  private loadEndpoints(): void {
    this.endpointsLoading = true;
    this.api.getApiKeyUsageByEndpoint(this.queryParams).subscribe({
      next: resp => {
        this.endpointUsage = resp;
        this.endpointsUnavailable = false;
        this.endpointsLoading = false;
        this.rebuildTree();
      },
      error: () => {
        // Un back anterior a este agregado: el resto de la pantalla sigue.
        this.endpointUsage = null;
        this.endpointsUnavailable = true;
        this.endpointsLoading = false;
        this.rebuildTree();
      }
    });
  }

  private rebuildTree(): void {
    this.tree = buildUsageTree(this.catalog, this.endpointUsage?.items ?? []);
    this.visibleTree = filterUsageTree(this.tree, this.endpointQuery);
    if (!this.endpointPickedByUser && this.endpointUsage) {
      // Hasta que la persona toque el árbol, el grupo abierto sigue a los datos.
      this.openGroups.clear();
    }
    if (!this.openGroups.size && this.visibleTree.length) {
      // Abre solo el grupo con más tráfico: el árbol entero desplegado es una
      // lista de 50 rutas, y lo que se busca de entrada es lo que más se usa.
      const busiest = [...this.visibleTree].sort((a, b) => b.total_requests - a.total_requests)[0];
      this.openGroups.add(busiest.name);
    }
    const stillThere = this.endpointPickedByUser && this.selectedEndpoint ? this.findEndpoint(this.visibleTree, this.selectedEndpoint.key) : null;
    this.selectedEndpoint = stillThere ?? this.busiestEndpoint(this.visibleTree);
  }

  private loadKeyDetail(id: number): void {
    this.detailLoading = true;
    this.api.getApiKeyUsage(id, this.queryParams).subscribe({
      next: resp => {
        this.keyDetail = resp;
        this.buildKeyCharts(resp);
        this.detailLoading = false;
      },
      error: err => {
        this.detailLoading = false;
        this.toastError(err);
      }
    });
  }

  private loadLogs(): void {
    this.logsLoading = true;
    this.api.getApiKeyUsageLogs({ ...this.queryParams, limit: this.logsRows, offset: this.logsFirst }).subscribe({
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

  private buildConsumers(summary: UsageSummary): ConsumerRow[] {
    const total = summary.totals.total_requests || 0;
    const lastByMis = new Map<string, string | null>();
    for (const key of summary.keys ?? []) {
      const id = key.mis_acronym ?? '—';
      const prev = lastByMis.get(id) ?? null;
      if (key.last_used_at && (!prev || new Date(key.last_used_at) > new Date(prev))) {
        lastByMis.set(id, key.last_used_at);
      }
    }
    return (summary.by_mis ?? []).map(row => {
      const last = lastByMis.get(row.mis_acronym) ?? null;
      return {
        ...row,
        share: total ? Math.round((row.total_requests / total) * 1000) / 10 : 0,
        last_used_at: last,
        last_used_ts: last ? new Date(last).getTime() : 0,
        search_text: `${row.mis_acronym} ${row.mis_name} ${row.environment ?? ''}`.toLowerCase()
      };
    });
  }

  private buildKeyRows(summary: UsageSummary): KeyRow[] {
    return (summary.keys ?? []).map(key => ({
      ...key,
      last_used_ts: key.last_used_at ? new Date(key.last_used_at).getTime() : 0,
      status_label: this.statusOf(key),
      search_text: `${key.name} ${key.key_prefix} ${key.mis_acronym ?? ''} ${key.environment ?? ''}`.toLowerCase()
    }));
  }

  private findLastActivity(summary: UsageSummary): { at: string | null; key: string | null } {
    let best: { at: string | null; key: string | null } = { at: null, key: null };
    for (const key of summary.keys ?? []) {
      if (key.last_used_at && (!best.at || new Date(key.last_used_at) > new Date(best.at))) {
        best = { at: key.last_used_at, key: key.name };
      }
    }
    return best;
  }

  private buildSummaryCharts(summary: UsageSummary): void {
    this.timelineChart = {
      labels: summary.time_series.map(p => p.date),
      datasets: [
        {
          label: 'Requests',
          data: summary.time_series.map(p => p.count),
          borderColor: this.colors.brand,
          backgroundColor: this.colors.brandSoft,
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          pointBackgroundColor: this.colors.brand
        }
      ]
    };

    this.microserviceChart = {
      labels: summary.by_microservice.map(m => m.microservice_name),
      datasets: [
        {
          label: 'Requests',
          data: summary.by_microservice.map(m => m.total_requests),
          backgroundColor: this.colors.brand,
          borderRadius: 4,
          maxBarThickness: 22
        }
      ]
    };
  }

  private buildKeyCharts(detail: ApiKeyUsageStats): void {
    this.keyTimelineChart = {
      labels: detail.time_series.map(p => p.date),
      datasets: [
        {
          label: 'Requests',
          data: detail.time_series.map(p => p.count),
          borderColor: this.colors.brand,
          backgroundColor: this.colors.brandSoft,
          fill: true,
          tension: 0.35,
          pointRadius: 2
        }
      ]
    };

    this.keyMicroserviceChart = {
      labels: detail.by_microservice.map(m => m.label),
      datasets: [
        {
          data: detail.by_microservice.map(m => m.total_requests),
          backgroundColor: this.colors.brand,
          borderRadius: 4,
          maxBarThickness: 22
        }
      ]
    };
  }

  private resolveRange(): { from: Date; to: Date } {
    const now = new Date();
    if (this.rangePreset === 'custom' && this.customFrom && this.customTo) {
      return { from: this.startOfDay(this.customFrom), to: this.endOfDay(this.customTo) };
    }
    const to = this.endOfDay(now);
    let from: Date;
    switch (this.rangePreset) {
      case '7d':
        from = this.daysBefore(to, 7);
        break;
      case '90d':
        from = this.daysBefore(to, 90);
        break;
      case '12m':
        from = new Date(to);
        from.setFullYear(from.getFullYear() - 1);
        break;
      case 'ytd':
        from = new Date(to.getFullYear(), 0, 1);
        break;
      case 'all':
        from = ALL_TIME_FROM;
        break;
      case '30d':
      case 'custom':
      default:
        from = this.daysBefore(to, 30);
    }
    return { from: this.startOfDay(from), to };
  }

  private daysBefore(date: Date, days: number): Date {
    return new Date(date.getTime() - days * 86_400_000);
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

  private dropApiKeyParam(): void {
    if (this.route.snapshot.queryParamMap.has('api_key')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { api_key: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  private isVisible(endpoint: UsageTreeEndpoint): boolean {
    return !!this.findEndpoint(this.visibleTree, endpoint.key);
  }

  private findEndpoint(groups: UsageTreeGroup[], key: string): UsageTreeEndpoint | null {
    for (const group of groups) {
      for (const category of group.categories) {
        const hit = category.endpoints.find(e => e.key === key);
        if (hit) return hit;
      }
    }
    return null;
  }

  private firstEndpoint(groups: UsageTreeGroup[]): UsageTreeEndpoint | null {
    return groups[0]?.categories[0]?.endpoints[0] ?? null;
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

  private token(name: string, fallback: string): string {
    if (typeof getComputedStyle !== 'function' || typeof document === 'undefined') {
      return fallback;
    }
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  private toastError(err: any): void {
    const detail = err?.error?.message ?? err?.message ?? 'Failed to load usage metrics';
    this.messages.add({ severity: 'error', summary: 'Overview', detail });
  }
}
