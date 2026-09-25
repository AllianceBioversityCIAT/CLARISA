import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnDestroy } from '@angular/core';
import { bandPath, monotonePath } from '../../utils/chart-geometry';

let uid = 0;

/** Mini tendencia de una tarjeta de cifra: área suave y el valor del día al pasar el mouse. */
@Component({
  selector: 'app-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg *ngIf="width" [attr.width]="width" [attr.height]="height" [attr.viewBox]="'0 0 ' + width + ' ' + height" aria-hidden="true">
      <defs>
        <linearGradient [attr.id]="gid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" [attr.stop-color]="color" stop-opacity="0.3" />
          <stop offset="100%" [attr.stop-color]="color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path [attr.d]="area" [attr.fill]="'url(#' + gid + ')'" />
      <path [attr.d]="line" fill="none" [attr.stroke]="color" stroke-width="1.75" />
      <circle *ngIf="hover !== null" [attr.cx]="pts[hover].x" [attr.cy]="pts[hover].y" r="3" [attr.fill]="color" stroke="#fff" stroke-width="1.5" />
      <rect [attr.width]="width" [attr.height]="height" fill="transparent" (mousemove)="onMove($event)" (mouseleave)="hover = null" />
    </svg>
    <span class="sp-tip" *ngIf="hover !== null" [style.left.px]="pts[hover].x" [class.is-left]="pts[hover].x > width / 2">
      <b>{{ fmt(values[hover]) }}{{ unit }}</b> {{ labels[hover] ? '· ' + day(labels[hover]) : '' }}
    </span>
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
        width: 100%;
      }
      svg {
        display: block;
      }
      .sp-tip {
        position: absolute;
        bottom: calc(100% + 2px);
        transform: translateX(-10%);
        white-space: nowrap;
        background: #fff;
        border: 1px solid #e4e4e7;
        border-radius: 6px;
        padding: 2px 7px;
        font-size: 11px;
        color: #71717a;
        box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.15);
        pointer-events: none;
      }
      .sp-tip.is-left {
        transform: translateX(-90%);
      }
      .sp-tip b {
        color: #09090b;
        font-variant-numeric: tabular-nums;
      }
    `
  ]
})
export class SparklineComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() values: number[] = [];
  @Input() labels: string[] = [];
  @Input() color = '#0b7554';
  @Input() height = 44;
  @Input() unit = '';

  width = 0;
  pts: { x: number; y: number }[] = [];
  line = '';
  area = '';
  hover: number | null = null;
  readonly gid = `sp${++uid}`;
  private observer?: ResizeObserver;

  constructor(
    private host: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) {}

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

  onMove(event: MouseEvent): void {
    const n = this.values.length;
    if (n < 2) {
      return;
    }
    const x = event.offsetX;
    this.hover = Math.max(0, Math.min(n - 1, Math.round((x / this.width) * (n - 1))));
    this.cdr.markForCheck();
  }

  fmt(v: number): string {
    return Math.round((v ?? 0) * 100) / 100 === Math.round(v ?? 0) ? Math.round(v ?? 0).toLocaleString('en-US') : (v ?? 0).toFixed(2);
  }

  day(iso: string): string {
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    const n = this.values.length;
    if (!this.width || !n) {
      this.pts = [];
      this.line = this.area = '';
      return;
    }
    const max = Math.max(...this.values, 0);
    const min = Math.min(...this.values, 0);
    const span = max - min || 1;
    const pad = 4;
    this.pts = this.values.map((v, i) => ({
      x: n === 1 ? this.width / 2 : (i * this.width) / (n - 1),
      y: pad + (1 - (v - min) / span) * (this.height - pad * 2)
    }));
    this.line = monotonePath(this.pts);
    this.area = bandPath(
      this.pts,
      this.pts.map(p => ({ x: p.x, y: this.height }))
    );
  }
}
