import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

export interface PickerSystem {
  /** MIS id; `0` = keys with no system */
  id: number;
  label: string;
  sub: string;
  color: string;
  calls: number;
}

/**
 * Elegir qué sistemas se ven (Yeck, 25-sep-2026: «que pueda también
 * seleccionar los sistemas que quiero ver»). CLARISA tiene 31 MIS
 * registrados: no caben como chips, así que es un desplegable con buscador,
 * casillas y tres atajos. Los elegidos quedan a la vista como chips con su
 * color, que es el mismo color que llevan en todas las gráficas.
 */
@Component({
  selector: 'app-system-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sp">
      <button type="button" class="sp-trigger" (click)="toggle()" [attr.aria-expanded]="open">
        <i class="pi pi-sliders-h" aria-hidden="true"></i>
        <span>Systems</span>
        <b>{{ selected.length }} of {{ systems.length }}</b>
        <i class="pi pi-chevron-down sp-caret" aria-hidden="true"></i>
      </button>
      <div class="sp-panel" *ngIf="open" role="dialog" aria-label="Choose the systems to show">
        <div class="sp-search">
          <i class="pi pi-search" aria-hidden="true"></i>
          <input
            type="text"
            [value]="query"
            (input)="query = $any($event.target).value"
            placeholder="Search systems"
            aria-label="Search systems"
            autofocus />
        </div>
        <div class="sp-quick">
          <button type="button" (click)="emit(top(5))">Top 5</button>
          <button type="button" (click)="emit(top(10))">Top 10</button>
          <button type="button" (click)="emit(all())">All</button>
          <button type="button" (click)="emit(onlyWithCalls())">With calls</button>
        </div>
        <ul class="sp-list">
          <li *ngFor="let s of filtered">
            <label [class.is-off]="!isOn(s.id)">
              <input type="checkbox" [checked]="isOn(s.id)" (change)="flip(s.id)" />
              <i class="sp-dot" [style.background]="s.color"></i>
              <span class="sp-name"
                ><b>{{ s.label }}</b
                ><small>{{ s.sub }}</small></span
              >
              <span class="sp-calls">{{ s.calls ? fmt(s.calls) : 'no calls' }}</span>
            </label>
          </li>
          <li class="sp-none" *ngIf="!filtered.length">Nothing matches «{{ query }}».</li>
        </ul>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        position: relative;
      }
      .sp-trigger {
        height: 34px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        border: 1px solid var(--cl-line);
        border-radius: 8px;
        background: #fff;
        color: var(--cl-ink-2);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
      }
      .sp-trigger b {
        color: #09090b;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .sp-trigger:hover {
        border-color: var(--cl-brand-ring);
      }
      .sp-caret {
        font-size: 10px;
        color: #a1a1aa;
      }
      .sp-panel {
        position: absolute;
        z-index: 30;
        top: calc(100% + 6px);
        left: 0;
        width: min(380px, 92vw);
        background: #fff;
        border: 1px solid var(--cl-line);
        border-radius: 12px;
        box-shadow: 0 18px 40px -16px rgba(0, 0, 0, 0.28);
        padding: 8px;
      }
      .sp-search {
        position: relative;
      }
      .sp-search .pi {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 12px;
        color: #a1a1aa;
      }
      .sp-search input {
        width: 100%;
        height: 36px;
        border: 1px solid var(--cl-line);
        border-radius: 8px;
        padding: 0 10px 0 30px;
        font-size: 16px;
        outline: none;
      }
      .sp-search input:focus {
        border-color: var(--cl-brand);
        box-shadow: 0 0 0 2px var(--cl-brand-ring);
      }
      .sp-quick {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        padding: 8px 2px;
        border-bottom: 1px solid #f4f4f5;
      }
      .sp-quick button {
        border: 1px solid var(--cl-line);
        background: #fafafa;
        border-radius: 999px;
        padding: 3px 10px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        color: var(--cl-ink-2);
      }
      .sp-quick button:hover {
        background: var(--cl-brand-soft);
        color: var(--cl-brand-deeper);
        border-color: var(--cl-brand-ring);
      }
      .sp-list {
        list-style: none;
        margin: 0;
        padding: 4px 0 0;
        max-height: 320px;
        overflow-y: auto;
      }
      .sp-list label {
        display: grid;
        grid-template-columns: 16px 10px minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        padding: 7px 8px;
        border-radius: 8px;
        cursor: pointer;
      }
      .sp-list label:hover {
        background: #f4f4f5;
      }
      .sp-list label.is-off .sp-dot {
        opacity: 0.35;
      }
      .sp-list input {
        accent-color: var(--cl-brand);
        margin: 0;
      }
      .sp-dot {
        width: 10px;
        height: 10px;
        border-radius: 3px;
        display: block;
      }
      .sp-name {
        min-width: 0;
      }
      .sp-name b {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #09090b;
      }
      .sp-name small {
        display: block;
        font-size: 11.5px;
        color: #71717a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sp-calls {
        font-size: 12px;
        color: #71717a;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .sp-none {
        padding: 14px 8px;
        color: #71717a;
        font-size: 13px;
      }
    `
  ]
})
export class SystemPickerComponent {
  @Input() systems: PickerSystem[] = [];
  @Input() selected: number[] = [];
  @Output() selectedChange = new EventEmitter<number[]>();

  open = false;
  query = '';

  constructor(private host: ElementRef<HTMLElement>) {}

  get filtered(): PickerSystem[] {
    const q = this.query.trim().toLowerCase();
    return q ? this.systems.filter(s => `${s.label} ${s.sub}`.toLowerCase().includes(q)) : this.systems;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open = false;
  }

  toggle(): void {
    this.open = !this.open;
    this.query = '';
  }

  isOn(id: number): boolean {
    return this.selected.includes(id);
  }

  /** Nunca deja la selección vacía: un tablero sin sistemas no dice nada. */
  flip(id: number): void {
    const next = this.isOn(id) ? this.selected.filter(x => x !== id) : [...this.selected, id];
    if (next.length) {
      this.emit(next);
    }
  }

  top(n: number): number[] {
    return [...this.systems]
      .sort((a, b) => b.calls - a.calls)
      .slice(0, n)
      .map(s => s.id);
  }

  all(): number[] {
    return this.systems.map(s => s.id);
  }

  onlyWithCalls(): number[] {
    const ids = this.systems.filter(s => s.calls > 0).map(s => s.id);
    return ids.length ? ids : this.top(5);
  }

  emit(ids: number[]): void {
    if (ids.length) {
      this.selected = ids;
      this.selectedChange.emit(ids);
    }
  }

  fmt(v: number): string {
    return v.toLocaleString('en-US');
  }
}
