import { ChangeDetectionStrategy, Component, Input, ViewChild, ViewEncapsulation } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

/**
 * Small "(i)" next to a form label: says what the field is for, with an
 * example. Hover, keyboard focus or a tap opens it; Escape or leaving closes it.
 *
 * It sits OUTSIDE the `<label>`, never inside: a label's accessible name would
 * otherwise swallow the whole explanation and the input would be announced
 * with it on every visit.
 *
 * Styles are not encapsulated because the tooltip is appended to `<body>`;
 * every selector is prefixed `gc-info` so nothing else in the panel changes.
 */
@Component({
  selector: 'app-gc-info',
  template: `<span
    class="gc-info"
    role="img"
    tabindex="0"
    [attr.aria-label]="text"
    [pTooltip]="text"
    tooltipPosition="top"
    tooltipStyleClass="gc-info-tip"
    (focus)="show()"
    (blur)="hide()"
    (click)="onTap($event)"
    (keydown.escape)="hide()"
    ><i class="pi pi-info-circle" aria-hidden="true"></i
  ></span>`,
  styles: [
    `
      app-gc-info {
        display: inline-flex;
        flex: 0 0 auto;
        vertical-align: middle;
      }
      .gc-info {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 999px;
        color: var(--cl-ink-3);
        cursor: help;
        outline: none;
        transition: color 0.15s, background 0.15s, box-shadow 0.15s;
      }
      .gc-info .pi {
        font-size: 13px;
      }
      .gc-info:hover {
        color: var(--cl-brand-deeper);
      }
      .gc-info:focus-visible {
        color: var(--cl-brand-deeper);
        box-shadow: 0 0 0 2px var(--cl-brand-ring);
      }
      .p-tooltip.gc-info-tip {
        max-width: 300px;
      }
      .p-tooltip.gc-info-tip .p-tooltip-text {
        padding: 8px 10px;
        border-radius: 8px;
        background: var(--cl-ink);
        color: var(--cl-surface);
        font-size: 12px;
        font-weight: 500;
        line-height: 1.5;
        box-shadow: 0 8px 24px -8px rgba(16, 36, 28, 0.45);
      }
      .p-tooltip.gc-info-tip.p-tooltip-top .p-tooltip-arrow {
        border-top-color: var(--cl-ink);
      }
    `
  ],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GcInfoComponent {
  @Input() text = '';
  @ViewChild(Tooltip) private readonly _tip?: Tooltip;

  show(): void {
    if (this.text) this._tip?.activate();
  }

  hide(): void {
    this._tip?.deactivate();
  }

  /**
   * The tooltip's own click listener closes it, which on a phone means a tap
   * never shows anything. Re-open it right after, and keep the tap from
   * reaching a surrounding label (which would move focus to its input).
   */
  onTap(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    setTimeout(() => this.show());
  }
}
