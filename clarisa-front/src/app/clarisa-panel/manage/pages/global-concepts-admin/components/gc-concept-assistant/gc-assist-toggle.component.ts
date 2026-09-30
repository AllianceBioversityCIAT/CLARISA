import { Component, EventEmitter, Input, Output } from '@angular/core';

/** The «Assistant» switch in the concept editor header (sparkles). Off: brand outline. On: the panel's carbon. */
@Component({
  selector: 'app-gc-assist-toggle',
  template: `<button
    type="button"
    class="gc-at"
    [class.is-on]="on"
    [attr.aria-pressed]="on"
    aria-controls="gc-assist-panel"
    [title]="on ? 'Hide the assistant' : 'Open the assistant: it fills the form with you'"
    (click)="toggled.emit()">
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5l1.4 3.6L13 6.5 9.4 7.9 8 11.5 6.6 7.9 3 6.5l3.6-1.4L8 1.5zM12.5 10l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4z" />
    </svg>
    <span class="gc-at__label">Assistant</span>
    <span class="gc-at__count" *ngIf="count" [attr.aria-label]="count + ' suggestions to review'">{{ count }}</span>
  </button>`,
  styleUrls: ['./gc-assist-toggle.component.scss']
})
export class GcAssistToggleComponent {
  @Input() on = false;
  /** AI suggestions still waiting for Keep / Undo. */
  @Input() count = 0;
  @Output() toggled = new EventEmitter<void>();
}
