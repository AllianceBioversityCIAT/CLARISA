import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { GlobalConceptsApiService, PlatformUsage, UsageSummary } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { PlatformRow, platformRows, USAGE_COLORS, UsageChart, usageSeries, UsageSeries, usageViewModel, UsageViewModel } from '../../utils/usage-view';

/** Which terms are searched for and used (checklist row 10, contract v2 § 3). */
@Component({
  selector: 'app-gc-usage-panel',
  templateUrl: './gc-usage-panel.component.html',
  styleUrls: ['./gc-usage-panel.component.scss']
})
export class GcUsagePanelComponent implements OnInit, OnChanges {
  @Input() scheme = 'concepts';
  /** A search nobody found: the shell opens the concept dialog with it. */
  @Output() createConcept = new EventEmitter<string>();

  readonly periods = [
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 }
  ];
  days = 30;

  loading = false;
  loadError: string | null = null;
  summary: UsageSummary | null = null;
  view: UsageViewModel = usageViewModel(null, 30);
  /** Stacked daily mix and one sparkline per tile, for the shared panel charts. */
  mix: { labels: string[]; series: UsageSeries[]; sparks: Record<string, number[]> } = usageSeries(null, 30);
  readonly colors = USAGE_COLORS;
  /** Index of the day under the pointer, for the tooltip. */
  hover: number | null = null;
  private requestId = 0;

  /**
   * "By platform" (Héctor, 2026-09-30): connected systems that read with their
   * API key. Loaded apart, so its failure never hides the figures above.
   */
  platforms: PlatformUsage | null = null;
  platformRows: PlatformRow[] = [];
  platformsLoading = false;
  platformsError: string | null = null;
  private platformsRequestId = 0;

  constructor(private readonly _api: GlobalConceptsApiService) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scheme'] && !changes['scheme'].firstChange) this.load();
  }

  setPeriod(days: number): void {
    if (days === this.days && this.summary) return;
    this.days = days;
    this.load();
  }

  load(): void {
    // Switching period quickly: only the last answer is drawn.
    const id = ++this.requestId;
    this.loading = true;
    this.loadError = null;
    this._api.usage(this.scheme, this.days).subscribe({
      next: summary => {
        if (id !== this.requestId) return;
        this.loading = false;
        this.summary = summary ?? null;
        this.view = usageViewModel(this.summary, this.days);
        this.mix = usageSeries(this.summary, this.days);
        this.hover = null;
      },
      error: error => {
        if (id !== this.requestId) return;
        this.loading = false;
        this.loadError = apiErrorMessage(error, 'The usage figures could not be loaded');
      }
    });
    this.loadPlatforms();
  }

  loadPlatforms(): void {
    const id = ++this.platformsRequestId;
    this.platformsLoading = true;
    this.platformsError = null;
    this._api.usageByPlatform(this.scheme, this.days).subscribe({
      next: usage => {
        if (id !== this.platformsRequestId) return;
        this.platformsLoading = false;
        this.platforms = usage ?? null;
        this.platformRows = platformRows(this.platforms);
      },
      error: error => {
        if (id !== this.platformsRequestId) return;
        this.platformsLoading = false;
        this.platforms = null;
        this.platformRows = [];
        this.platformsError = apiErrorMessage(error, 'The usage by platform could not be loaded');
      }
    });
  }

  trackByPlatform(_: number, row: PlatformRow): string {
    return row.key;
  }

  get chart(): UsageChart {
    return this.view.chart;
  }

  get hovered() {
    return this.hover === null ? null : this.chart.columns[this.hover] ?? null;
  }

  /** SVG units to a percentage of the box, for the HTML laid over the chart. */
  pct(value: number, total: number): number {
    return total ? (value / total) * 100 : 0;
  }

  create(item: string): void {
    this.createConcept.emit(item);
  }
}
