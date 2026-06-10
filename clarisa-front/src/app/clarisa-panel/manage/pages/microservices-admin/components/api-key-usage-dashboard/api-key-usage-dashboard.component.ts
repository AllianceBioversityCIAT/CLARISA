import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  ApiKeyUsageStats,
  ManageApiService,
  UsageLogsPage,
  UsageQueryParams,
  UsageSummary,
} from '../../../../services/manage-api.service';

type RangePreset = '7d' | '30d' | '90d' | 'custom';

@Component({
  selector: 'app-api-key-usage-dashboard',
  templateUrl: './api-key-usage-dashboard.component.html',
  styleUrls: ['./api-key-usage-dashboard.component.scss'],
})
export class ApiKeyUsageDashboardComponent implements OnInit {
  loading = false;
  logsLoading = false;
  detailLoading = false;

  rangePreset: RangePreset = '30d';
  customFrom: Date | null = null;
  customTo: Date | null = null;
  granularity: 'day' | 'week' = 'day';

  summary: UsageSummary | null = null;
  keyDetail: ApiKeyUsageStats | null = null;
  logs: UsageLogsPage | null = null;

  filterMisId: number | null = null;
  filterApiKeyId: number | null = null;
  filterMicroservice: string | null = null;

  mises: { id: number; label: string }[] = [];
  apiKeyOptions: { id: number; label: string }[] = [];
  microserviceOptions: { value: string; label: string }[] = [];

  timelineChart: any;
  microserviceChart: any;
  keyTimelineChart: any;
  keyMicroserviceChart: any;

  readonly rangeOptions = [
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 90 days', value: '90d' },
    { label: 'Custom', value: 'custom' },
  ];

  constructor(
    private api: ManageApiService,
    private messages: MessageService,
  ) {}

  ngOnInit(): void {
    this.api.getAllMis().subscribe({
      next: (resp: any) => {
        const list = Array.isArray(resp) ? resp : [];
        this.mises = list.map((mis: any) => ({
          id: mis.id,
          label: `${mis.acronym} — ${mis.name}`,
        }));
      },
    });
    this.loadDashboard();
  }

  get queryParams(): UsageQueryParams {
    const range = this.resolveRange();
    const params: UsageQueryParams = {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      granularity: this.granularity,
    };
    if (this.filterMisId) params.mis_id = this.filterMisId;
    if (this.filterApiKeyId) params.api_key_id = this.filterApiKeyId;
    if (this.filterMicroservice) params.microservice_name = this.filterMicroservice;
    return params;
  }

  onRangeChange(): void {
    if (this.rangePreset !== 'custom') {
      this.loadDashboard();
    }
  }

  applyCustomRange(): void {
    if (!this.customFrom || !this.customTo) {
      return;
    }
    this.loadDashboard();
  }

  onFiltersChange(): void {
    this.loadDashboard();
    if (this.filterApiKeyId) {
      this.loadKeyDetail(this.filterApiKeyId);
    } else {
      this.keyDetail = null;
    }
  }

  selectApiKey(id: number): void {
    this.filterApiKeyId = id;
    this.loadKeyDetail(id);
    this.loadLogs();
  }

  clearKeyDetail(): void {
    this.filterApiKeyId = null;
    this.keyDetail = null;
    this.loadDashboard();
  }

  refresh(): void {
    this.loadDashboard();
    if (this.filterApiKeyId) {
      this.loadKeyDetail(this.filterApiKeyId);
    }
    this.loadLogs();
  }

  exportLogsCsv(): void {
    if (!this.logs?.items?.length) {
      return;
    }
    const header = [
      'created_at',
      'mis',
      'api_key',
      'microservice',
      'endpoint',
      'method',
      'status',
      'response_ms',
      'ip',
    ];
    const rows = this.logs.items.map((row) => [
      row.created_at,
      row.mis_acronym ?? '',
      row.key_prefix,
      row.microservice_name,
      row.endpoint_accessed,
      row.http_method ?? '',
      row.status_code ?? '',
      row.response_time_ms ?? '',
      row.ip_address ?? '',
    ]);
    const csv = [header, ...rows]
      .map((line) =>
        line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `api-key-usage-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  formatNumber(value: number | null | undefined): string {
    if (value == null) return '—';
    return value.toLocaleString();
  }

  formatMs(value: number | null | undefined): string {
    if (value == null) return '—';
    return `${value} ms`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  }

  errorRate(): string {
    const total = this.summary?.totals.total_requests ?? 0;
    const errors = this.summary?.totals.error_count ?? 0;
    if (!total) return '0%';
    return `${((errors / total) * 100).toFixed(1)}%`;
  }

  private loadDashboard(): void {
    this.loading = true;
    this.api.getApiKeyUsageSummary(this.queryParams).subscribe({
      next: (resp) => {
        this.summary = resp;
        this.apiKeyOptions = (resp.keys ?? []).map((key) => ({
          id: key.id,
          label: `${key.name} (${key.key_prefix}…)`,
        }));
        this.microserviceOptions = (resp.by_microservice ?? []).map((ms) => ({
          value: ms.microservice_name,
          label: ms.microservice_name,
        }));
        this.buildSummaryCharts(resp);
        this.loading = false;
        this.loadLogs();
      },
      error: (err) => {
        this.loading = false;
        this.toastError(err);
      },
    });
  }

  private loadKeyDetail(id: number): void {
    this.detailLoading = true;
    this.api.getApiKeyUsage(id, this.queryParams).subscribe({
      next: (resp) => {
        this.keyDetail = resp;
        this.buildKeyCharts(resp);
        this.detailLoading = false;
      },
      error: (err) => {
        this.detailLoading = false;
        this.toastError(err);
      },
    });
  }

  private loadLogs(): void {
    this.logsLoading = true;
    this.api
      .getApiKeyUsageLogs({ ...this.queryParams, limit: 100, offset: 0 })
      .subscribe({
        next: (resp) => {
          this.logs = resp;
          this.logsLoading = false;
        },
        error: (err) => {
          this.logsLoading = false;
          this.toastError(err);
        },
      });
  }

  private buildSummaryCharts(summary: UsageSummary): void {
    const labels = summary.time_series.map((p) => p.date);
    this.timelineChart = {
      labels,
      datasets: [
        {
          label: 'Requests',
          data: summary.time_series.map((p) => p.count),
          borderColor: '#0065bd',
          backgroundColor: 'rgba(0, 101, 189, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#0065bd',
        },
      ],
    };

    const msLabels = summary.by_microservice.map((m) => m.microservice_name);
    this.microserviceChart = {
      labels: msLabels,
      datasets: [
        {
          label: 'Requests',
          data: summary.by_microservice.map((m) => m.total_requests),
          backgroundColor: [
            '#0065bd',
            '#7ab800',
            '#3b82f6',
            '#0ea5e9',
            '#64748b',
            '#94a3b8',
          ],
          borderRadius: 4,
        },
      ],
    };
  }

  private buildKeyCharts(detail: ApiKeyUsageStats): void {
    this.keyTimelineChart = {
      labels: detail.time_series.map((p) => p.date),
      datasets: [
        {
          label: 'Requests',
          data: detail.time_series.map((p) => p.count),
          borderColor: '#7ab800',
          backgroundColor: 'rgba(122, 184, 0, 0.15)',
          fill: true,
          tension: 0.35,
        },
      ],
    };

    this.keyMicroserviceChart = {
      labels: detail.by_microservice.map((m) => m.label),
      datasets: [
        {
          data: detail.by_microservice.map((m) => m.total_requests),
          backgroundColor: '#0065bd',
          borderRadius: 4,
        },
      ],
    };
  }

  private resolveRange(): { from: Date; to: Date } {
    const toRaw =
      this.rangePreset === 'custom' && this.customTo
        ? this.customTo
        : new Date();
    const to = this.endOfDay(toRaw);

    let from: Date;
    if (this.rangePreset === 'custom' && this.customFrom) {
      from = this.startOfDay(this.customFrom);
    } else {
      const days =
        this.rangePreset === '7d' ? 7 : this.rangePreset === '90d' ? 90 : 30;
      from = this.startOfDay(
        new Date(to.getTime() - days * 24 * 60 * 60 * 1000),
      );
    }
    return { from, to };
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
    const detail =
      err?.error?.message ?? err?.message ?? 'Failed to load usage metrics';
    this.messages.add({ severity: 'error', summary: 'Usage dashboard', detail });
  }
}
