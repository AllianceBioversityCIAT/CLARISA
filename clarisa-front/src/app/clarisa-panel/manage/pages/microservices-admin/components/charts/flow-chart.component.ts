import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output
} from '@angular/core';

export interface FlowNode {
  key: string;
  label: string;
  /** Segunda línea bajo la etiqueta (entorno, método…) */
  sub?: string;
  color: string;
  value: number;
}

export interface FlowLink {
  from: string;
  to: string;
  value: number;
}

interface PlacedNode extends FlowNode {
  y: number;
  h: number;
}

interface PlacedLink extends FlowLink {
  d: string;
  width: number;
  color: string;
  title: string;
}

/**
 * Sankey de dos columnas (sistemas → endpoints). Es bipartito, así que el
 * acomodo se calcula directo sin d3: cada columna apila sus nodos por volumen
 * y cada banda ocupa su tajada en el nodo de origen y en el de destino.
 *
 * Lo que pidió Yeck el 25-sep-2026 («no se ve a qué corresponde cada línea»):
 * cada banda lleva el color de su sistema, y al pasar por un sistema se
 * apagan las bandas de los demás.
 */
@Component({
  selector: 'app-flow-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      *ngIf="width"
      [attr.width]="width"
      [attr.height]="height"
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      role="img"
      aria-label="Calls from each system to each endpoint">
      <path
        *ngFor="let l of placedLinks"
        [attr.d]="l.d"
        fill="none"
        [attr.stroke]="l.color"
        [attr.stroke-width]="l.width"
        [attr.stroke-opacity]="!focus ? 0.32 : focus === l.from ? 0.62 : 0.05"
        class="fc-link"
        (mouseenter)="setFocus(l.from)"
        (mouseleave)="setFocus(null)">
        <title>{{ l.title }}</title>
      </path>
      <g
        *ngFor="let n of placedLeft"
        class="fc-node is-source"
        [style.opacity]="focus && focus !== n.key ? 0.35 : 1"
        (mouseenter)="setFocus(n.key)"
        (mouseleave)="setFocus(null)"
        (click)="picked.emit(n.key)">
        <rect [attr.x]="leftX" [attr.y]="n.y" [attr.width]="nodeWidth" [attr.height]="n.h" rx="3" [attr.fill]="n.color" />
        <text [attr.x]="leftX - 8" [attr.y]="n.y + n.h / 2 - 7" text-anchor="end" dominant-baseline="middle" class="fc-label">
          {{ clip(n.label, labelLeft - 12, 7.6) }}
        </text>
        <text [attr.x]="leftX - 8" [attr.y]="n.y + n.h / 2 + 8" text-anchor="end" dominant-baseline="middle" class="fc-value">
          {{ fmt(n.value) }} calls
        </text>
      </g>
      <g *ngFor="let n of placedRight" class="fc-node">
        <rect [attr.x]="rightX" [attr.y]="n.y" [attr.width]="nodeWidth" [attr.height]="n.h" rx="3" [attr.fill]="n.color" />
        <text [attr.x]="rightX + nodeWidth + 8" [attr.y]="n.y + n.h / 2 - 7" dominant-baseline="middle" class="fc-label is-mono">
          {{ clip(n.label, labelRight - 20, 7.3) }}
          <title>{{ n.label }}</title>
        </text>
        <text [attr.x]="rightX + nodeWidth + 8" [attr.y]="n.y + n.h / 2 + 8" dominant-baseline="middle" class="fc-value">
          {{ n.sub ? n.sub + ' · ' : '' }}{{ fmt(n.value) }} calls
        </text>
      </g>
    </svg>
    <p class="fc-empty" *ngIf="!left.length">No calls in this period.</p>
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
      .fc-link {
        transition: stroke-opacity 0.15s;
      }
      .fc-node.is-source {
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .fc-label {
        font-size: 12.5px;
        font-weight: 600;
        fill: #09090b;
      }
      .fc-label.is-mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
      }
      .fc-value {
        font-size: 11px;
        fill: #71717a;
      }
      .fc-empty {
        margin: 0;
        padding: 48px 0;
        text-align: center;
        color: #71717a;
        font-size: 13px;
      }
    `
  ]
})
export class FlowChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() left: FlowNode[] = [];
  @Input() right: FlowNode[] = [];
  @Input() links: FlowLink[] = [];
  @Input() height = 400;
  @Input() focus: string | null = null;
  @Output() focusChange = new EventEmitter<string | null>();
  @Output() picked = new EventEmitter<string>();

  width = 0;
  readonly nodeWidth = 10;
  /** Label gutters shrink with the card: on a phone 120 + 250 px left no room for the bands. */
  get labelLeft(): number {
    return this.width < 560 ? 92 : 120;
  }

  get labelRight(): number {
    return Math.min(250, Math.max(120, Math.round(this.width * 0.36)));
  }
  placedLeft: PlacedNode[] = [];
  placedRight: PlacedNode[] = [];
  placedLinks: PlacedLink[] = [];
  private observer?: ResizeObserver;

  constructor(
    private host: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) {}

  get leftX(): number {
    return this.labelLeft;
  }

  get rightX(): number {
    return Math.max(this.labelLeft + 80, this.width - this.labelRight - this.nodeWidth);
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
    this.layout();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  setFocus(key: string | null): void {
    this.focus = key;
    this.focusChange.emit(key);
    this.cdr.markForCheck();
  }

  fmt(v: number): string {
    return Math.round(v).toLocaleString('en-US');
  }

  /** Cuts a label to the gutter it has, keeping the end of a route (its most specific part). */
  clip(text: string, room: number, charWidth: number): string {
    const max = Math.max(4, Math.floor(room / charWidth));
    if (text.length <= max) {
      return text;
    }
    return text.startsWith('/') ? `…${text.slice(text.length - max + 1)}` : `${text.slice(0, max - 1)}…`;
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
    if (!this.width || !this.left.length || !this.right.length) {
      this.placedLeft = this.placedRight = [];
      this.placedLinks = [];
      return;
    }
    const pad = 12;
    const gap = 10;
    /** Room for the two label lines, however thin the node: small systems overlapped. */
    const slot = 30;
    const total = Math.max(
      this.left.reduce((a, n) => a + n.value, 0),
      this.right.reduce((a, n) => a + n.value, 0),
      1
    );
    // Scale so that every node gets at least `slot` px of column: the space
    // the minimum slots take is removed before sharing the rest by volume.
    const usable = (nodes: FlowNode[]) => {
      let k = (this.height - pad * 2 - gap * Math.max(0, nodes.length - 1)) / total;
      for (let i = 0; i < 4; i++) {
        const small = nodes.filter(n => n.value * k < slot);
        const reserved = small.length * slot;
        const bigTotal = nodes.filter(n => n.value * k >= slot).reduce((a, n) => a + n.value, 0) || 1;
        k = Math.max(0, this.height - pad * 2 - gap * Math.max(0, nodes.length - 1) - reserved) / bigTotal;
      }
      return k;
    };
    const k = Math.min(usable(this.left), usable(this.right));
    const stack = (nodes: FlowNode[]): PlacedNode[] => {
      const heights = nodes.map(n => Math.max(3, n.value * k));
      const slots = heights.map(h => Math.max(h, slot));
      const used = slots.reduce((a, h) => a + h, 0) + gap * (nodes.length - 1);
      let y = Math.max(pad, (this.height - used) / 2);
      return nodes.map((n, i) => {
        const placed = { ...n, y: y + (slots[i] - heights[i]) / 2, h: heights[i] };
        y += slots[i] + gap;
        return placed;
      });
    };
    this.placedLeft = stack(this.left);
    this.placedRight = stack(this.right);
    const leftOffset = new Map(this.placedLeft.map(n => [n.key, n.y]));
    const rightOffset = new Map(this.placedRight.map(n => [n.key, n.y]));
    const leftOrder = new Map(this.placedLeft.map((n, i) => [n.key, i]));
    const rightOrder = new Map(this.placedRight.map((n, i) => [n.key, i]));
    const colors = new Map(this.left.map(n => [n.key, n.color]));
    const labels = new Map([...this.left, ...this.right].map(n => [n.key, n.label]));
    const valid = this.links.filter(l => l.value > 0 && leftOrder.has(l.from) && rightOrder.has(l.to));
    // Sources hand out their slices in the order of the targets, and targets in
    // the order of the sources, so bands cross as little as possible.
    const bySource = [...valid].sort((a, b) => leftOrder.get(a.from)! - leftOrder.get(b.from)! || rightOrder.get(a.to)! - rightOrder.get(b.to)!);
    const sy = new Map<FlowLink, number>();
    for (const l of bySource) {
      const y = leftOffset.get(l.from)!;
      sy.set(l, y);
      leftOffset.set(l.from, y + l.value * k);
    }
    const byTarget = [...valid].sort((a, b) => rightOrder.get(a.to)! - rightOrder.get(b.to)! || leftOrder.get(a.from)! - leftOrder.get(b.from)!);
    const ty = new Map<FlowLink, number>();
    for (const l of byTarget) {
      const y = rightOffset.get(l.to)!;
      ty.set(l, y);
      rightOffset.set(l.to, y + l.value * k);
    }
    const x0 = this.leftX + this.nodeWidth;
    const x1 = this.rightX;
    const mid = (x0 + x1) / 2;
    this.placedLinks = valid.map(l => {
      const w = Math.max(1, l.value * k);
      const y0 = sy.get(l)! + w / 2;
      const y1 = ty.get(l)! + w / 2;
      return {
        ...l,
        width: w,
        color: colors.get(l.from) ?? '#a1a1aa',
        d: `M${x0},${y0} C${mid},${y0} ${mid},${y1} ${x1},${y1}`,
        title: `${labels.get(l.from)} → ${labels.get(l.to)} · ${this.fmt(l.value)} calls`
      };
    });
  }
}
