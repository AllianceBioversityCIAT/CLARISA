import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnDestroy } from '@angular/core';
import { bandPath, compactNumber, monotonePath, niceTicks, Pt, tickIndexes } from '../../utils/chart-geometry';

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface DrawnSeries extends ChartSeries {
  gradientId: string;
  area: string;
  line: string;
  tops: Pt[];
}

let uid = 0;

/**
 * Área apilada o líneas, en SVG propio con el look shadcn aprobado el
 * 25-sep-2026: rejilla horizontal tenue, degradado bajo cada color, cursor
 * vertical y un tooltip con el valor de cada sistema y el total.
 */
@Component({
  selector: 'app-usage-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="uc" [style.height.px]="height">
      <svg
        *ngIf="width"
        [attr.width]="width"
        [attr.height]="height"
        [attr.viewBox]="'0 0 ' + width + ' ' + height"
        role="img"
        [attr.aria-label]="ariaLabel">
        <defs>
          <linearGradient *ngFor="let s of drawn" [attr.id]="s.gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" [attr.stop-color]="s.color" stop-opacity="0.5" />
            <stop offset="100%" [attr.stop-color]="s.color" stop-opacity="0.06" />
          </linearGradient>
        </defs>
        <g class="uc-grid">
          <g *ngFor="let t of yTicks">
            <line [attr.x1]="padLeft" [attr.x2]="width - padRight" [attr.y1]="t.y" [attr.y2]="t.y" />
            <text [attr.x]="padLeft - 8" [attr.y]="t.y" text-anchor="end" dominant-baseline="middle">{{ t.label }}</text>
          </g>
          <text *ngFor="let t of xTicks" [attr.x]="t.x" [attr.y]="height - 6" [attr.text-anchor]="t.anchor">{{ t.label }}</text>
        </g>
        <ng-container *ngIf="mode === 'stack'">
          <path *ngFor="let s of drawn" [attr.d]="s.area" [attr.fill]="'url(#' + s.gradientId + ')'" />
        </ng-container>
        <path
          *ngFor="let s of drawn"
          [attr.d]="s.line"
          fill="none"
          [attr.stroke]="s.color"
          [attr.stroke-width]="mode === 'lines' ? 2 : 1.5"
          stroke-linejoin="round" />
        <g *ngIf="hover !== null">
          <line class="uc-cursor" [attr.x1]="xAt(hover)" [attr.x2]="xAt(hover)" [attr.y1]="padTop" [attr.y2]="height - padBottom" />
          <circle
            *ngFor="let s of drawn"
            [attr.cx]="xAt(hover)"
            [attr.cy]="s.tops[hover].y"
            r="3.5"
            [attr.fill]="s.color"
            stroke="#fff"
            stroke-width="1.5" />
        </g>
        <rect
          class="uc-hit"
          [attr.x]="padLeft"
          [attr.y]="padTop"
          [attr.width]="plotWidth"
          [attr.height]="plotHeight"
          (mousemove)="onMove($event)"
          (mouseleave)="hover = null" />
      </svg>
      <div class="uc-tip" *ngIf="hover !== null && tip" [style.left.px]="tipLeft" [class.is-left]="tipFlip">
        <div class="uc-tip__title">{{ tip.title }}</div>
        <div class="uc-tip__row" *ngFor="let row of tip.rows">
          <span><i [style.background]="row.color"></i>{{ row.label }}</span
          ><b>{{ row.value }}</b>
        </div>
        <div class="uc-tip__row uc-tip__total" *ngIf="tip.total">
          <span>Total</span><b>{{ tip.total }}</b>
        </div>
      </div>
      <p class="uc-empty" *ngIf="empty">{{ emptyText }}</p>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .uc {
        position: relative;
        width: 100%;
      }
      svg {
        display: block;
        overflow: visible;
      }
      .uc-grid line {
        stroke: #f0f0f1;
      }
      .uc-grid text {
        fill: #a1a1aa;
        font-size: 11px;
      }
      .uc-cursor {
        stroke: #d4d4d8;
      }
      .uc-hit {
        fill: transparent;
        cursor: crosshair;
      }
      .uc-tip {
        position: absolute;
        top: 8px;
        transform: translateX(12px);
        pointer-events: none;
        z-index: 2;
        min-width: 160px;
        background: #fff;
        border: 1px solid #e4e4e7;
        border-radius: 8px;
        padding: 8px 10px;
        box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.18);
        font-size: 12px;
      }
      .uc-tip.is-left {
        transform: translateX(calc(-100% - 12px));
      }
      .uc-tip__title {
        font-weight: 600;
        margin-bottom: 4px;
        color: #09090b;
      }
      .uc-tip__row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 1px 0;
      }
      .uc-tip__row span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #71717a;
      }
      .uc-tip__row i {
        width: 8px;
        height: 8px;
        border-radius: 2px;
        display: inline-block;
      }
      .uc-tip__row b {
        font-variant-numeric: tabular-nums;
        color: #09090b;
      }
      .uc-tip__total {
        border-top: 1px solid #f4f4f5;
        margin-top: 4px;
        padding-top: 4px;
      }
      .uc-empty {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        margin: 0;
        color: #71717a;
        font-size: 13px;
      }
    `
  ]
})
export class UsageChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() labels: string[] = [];
  @Input() series: ChartSeries[] = [];
  @Input() mode: 'stack' | 'lines' = 'stack';
  @Input() height = 280;
  @Input() unit = '';
  @Input() weekly = false;
  @Input() ariaLabel = 'Chart';
  @Input() emptyText = 'No calls in this period.';

  width = 0;
  readonly padLeft = 52;
  readonly padRight = 10;
  readonly padTop = 10;
  readonly padBottom = 26;

  drawn: DrawnSeries[] = [];
  yTicks: { y: number; label: string }[] = [];
  xTicks: { x: number; label: string; anchor: string }[] = [];
  hover: number | null = null;
  tip: { title: string; rows: { label: string; color: string; value: string }[]; total: string | null } | null = null;
  tipLeft = 0;
  tipFlip = false;
  empty = false;

  private readonly id = ++uid;
  private observer?: ResizeObserver;

  constructor(
    private host: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) {}

  get plotWidth(): number {
    return Math.max(0, this.width - this.padLeft - this.padRight);
  }

  get plotHeight(): number {
    return Math.max(0, this.height - this.padTop - this.padBottom);
  }

  ngAfterViewInit(): void {
    // The first measure happens outside this change-detection pass: setting
    // the width here changed a bound value after the check (NG0100).
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.measure());
      this.observer.observe(this.host.nativeElement);
    } else {
      setTimeout(() => this.measure());
    }
  }

  ngOnChanges(): void {
    this.hover = null;
    this.layout();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  xAt(i: number): number {
    const n = this.labels.length;
    return this.padLeft + (n <= 1 ? this.plotWidth / 2 : (i * this.plotWidth) / (n - 1));
  }

  onMove(event: MouseEvent): void {
    const n = this.labels.length;
    if (!n) {
      return;
    }
    const svg = (event.target as Element).closest('svg') as SVGSVGElement;
    const x = event.clientX - svg.getBoundingClientRect().left - this.padLeft;
    const i = Math.max(0, Math.min(n - 1, Math.round(n <= 1 ? 0 : (x / this.plotWidth) * (n - 1))));
    if (i === this.hover) {
      return;
    }
    this.hover = i;
    this.tipLeft = this.xAt(i);
    this.tipFlip = this.tipLeft > this.width * 0.62;
    const rows = [...this.series].reverse().map(s => ({ label: s.label, color: s.color, value: this.format(s.values[i] ?? 0) }));
    const total = this.series.reduce((a, s) => a + (s.values[i] ?? 0), 0);
    this.tip = {
      title: (this.weekly ? 'Week of ' : '') + this.longDate(this.labels[i]),
      rows,
      total: this.mode === 'stack' && this.series.length > 1 ? this.format(total) : null
    };
    this.cdr.markForCheck();
  }

  private measure(): void {
    const w = Math.round(this.host.nativeElement.getBoundingClientRect().width);
    if (w && w !== this.width) {
      this.width = w;
      this.layout();
      this.cdr.markForCheck();
    }
  }

  private layout(): void {
    const n = this.labels.length;
    const bottom = this.height - this.padBottom;
    this.empty = !n || !this.series.length || this.series.every(s => s.values.every(v => !v));
    if (!this.width || !n) {
      this.drawn = [];
      this.yTicks = [];
      this.xTicks = [];
      return;
    }
    const stacked = this.mode === 'stack';
    const acc = new Array(n).fill(0);
    let max = 0;
    for (const s of this.series) {
      for (let i = 0; i < n; i++) {
        const v = s.values[i] ?? 0;
        max = Math.max(max, stacked ? acc[i] + v : v);
        if (stacked) {
          acc[i] += v;
        }
      }
    }
    const ticks = niceTicks(max);
    const top = ticks[ticks.length - 1];
    const y = (v: number) => bottom - (v / top) * this.plotHeight;
    const base = new Array(n).fill(0);
    this.drawn = this.series.map((s, k) => {
      const lower = base.map((v, i) => ({ x: this.xAt(i), y: y(v) }));
      const tops = s.values.map((v, i) => ({ x: this.xAt(i), y: y((stacked ? base[i] : 0) + (v ?? 0)) }));
      if (stacked) {
        s.values.forEach((v, i) => (base[i] += v ?? 0));
      }
      return {
        ...s,
        gradientId: `uc${this.id}-${k}`,
        tops,
        line: monotonePath(tops),
        area: stacked ? bandPath(tops, lower) : ''
      };
    });
    this.yTicks = ticks.map((v, i) => ({ y: y(v), label: compactNumber(v) + (this.unit && i === ticks.length - 1 ? ` ${this.unit}` : '') }));
    this.xTicks = tickIndexes(n, Math.max(2, Math.floor(this.plotWidth / 90))).map((i, k, all) => ({
      x: this.xAt(i),
      label: this.shortDate(this.labels[i]),
      anchor: k === 0 && all.length > 1 ? 'start' : k === all.length - 1 && all.length > 1 ? 'end' : 'middle'
    }));
  }

  private format(v: number): string {
    return `${Math.round(v).toLocaleString('en-US')}${this.unit ? ' ' + this.unit : ''}`;
  }

  private shortDate(iso: string): string {
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private longDate(iso: string): string {
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
