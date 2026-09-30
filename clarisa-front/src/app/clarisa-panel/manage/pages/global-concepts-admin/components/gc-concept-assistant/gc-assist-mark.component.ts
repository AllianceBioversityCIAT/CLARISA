import { Component, Input, Optional } from '@angular/core';
import { GcAssistSession } from './gc-assist-session.service';

/**
 * What sits under a field the assistant touched. Two faces:
 * - «AI suggestion» pill: the AI typed the value; ✓ keeps it, ↺ puts back what was there.
 * - proposal bubble: the person had edited the field by hand, so the AI did not
 *   type over it; its value waits here with «Use this».
 * Renders nothing outside a dialog that provides the session.
 */
@Component({
  selector: 'app-gc-assist-mark',
  template: `
    <ng-container *ngIf="mark as m">
      <div class="gc-am gc-am--suggested" *ngIf="m.state === 'suggested'" role="status">
        <span
          class="gc-am__pill"
          [pTooltip]="m.reason || 'Suggested by the assistant'"
          tooltipPosition="top"
          tooltipStyleClass="gc-info-tip"
          tabindex="0">
          <svg class="gc-am__spark" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 1.5l1.4 3.6L13 6.5 9.4 7.9 8 11.5 6.6 7.9 3 6.5l3.6-1.4L8 1.5zM12.5 10l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4z" />
          </svg>
          AI suggestion
        </span>
        <span class="gc-am__actions">
          <button
            type="button"
            class="gc-am__btn gc-am__btn--ok"
            [attr.aria-label]="'Keep the suggestion for ' + label"
            title="Keep it"
            (click)="session!.accept(field)">
            <i class="pi pi-check" aria-hidden="true"></i><span>Keep</span>
          </button>
          <button
            type="button"
            class="gc-am__btn"
            [attr.aria-label]="'Undo the suggestion for ' + label"
            title="Put back the previous value"
            (click)="session!.undo(field)">
            <i class="pi pi-undo" aria-hidden="true"></i><span>Undo</span>
          </button>
        </span>
      </div>

      <div class="gc-am gc-am--proposal" *ngIf="m.state === 'proposal'" role="status">
        <div class="gc-am__head">
          <span class="gc-am__pill gc-am__pill--quiet">
            <svg class="gc-am__spark" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M8 1.5l1.4 3.6L13 6.5 9.4 7.9 8 11.5 6.6 7.9 3 6.5l3.6-1.4L8 1.5zM12.5 10l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4z" />
            </svg>
            Proposed · you edited this field
          </span>
          <button type="button" class="gc-am__x" [attr.aria-label]="'Dismiss the proposal for ' + label" (click)="session!.dismiss(field)">
            <i class="pi pi-times" aria-hidden="true"></i>
          </button>
        </div>
        <p class="gc-am__value">{{ shown(m.value) }}</p>
        <p class="gc-am__why" *ngIf="m.reason">{{ m.reason }}</p>
        <div class="gc-am__foot">
          <button type="button" class="gc-am__btn gc-am__btn--ok" (click)="session!.useProposal(field)">
            <i class="pi pi-arrow-up" aria-hidden="true"></i><span>Use this</span>
          </button>
        </div>
      </div>
    </ng-container>
  `,
  styleUrls: ['./gc-assist-mark.component.scss']
})
export class GcAssistMarkComponent {
  @Input() field = '';

  constructor(@Optional() readonly session: GcAssistSession | null) {}

  get mark() {
    return this.session?.markOf(this.field) ?? null;
  }

  get label(): string {
    return this.session?.label(this.field) ?? this.field;
  }

  shown(value: unknown): string {
    const text = this.session?.display(this.field, value) ?? '';
    return text.trim() ? text : '(empty)';
  }
}
