import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ACCESS_LIMITS } from '../../../../../shared/services/access-admin/access-admin-api.service';
import { ACCESS_INFO } from '../access-field-info';

/**
 * Small confirm that asks WHY before a role is taken away. The back refuses a
 * removal without a justification (5–500 characters), so the button stays off
 * until there is one.
 *
 * Locks itself on the first confirm (a second tap before the parent re-renders
 * would otherwise emit twice); it opens again when the parent clears `busy`
 * or shows an `error`.
 */
@Component({
  selector: 'app-access-justification',
  templateUrl: './justification-dialog.component.html'
})
export class JustificationDialogComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() title = 'Remove role';
  @Input() message = '';
  @Input() confirmLabel = 'Remove role';
  @Input() busy = false;
  @Input() error: string | null = null;
  @Output() confirmed = new EventEmitter<string>();

  readonly info = ACCESS_INFO.justification;
  readonly min = ACCESS_LIMITS.justificationMin;
  readonly max = ACCESS_LIMITS.justificationMax;

  text = '';
  private locked = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.text = '';
      this.locked = false;
    }
    if ((changes['busy'] && !this.busy) || (changes['error'] && this.error)) {
      this.locked = false;
    }
  }

  get valid(): boolean {
    const length = this.text.trim().length;
    return length >= this.min && length <= this.max;
  }

  get disabled(): boolean {
    return this.busy || this.locked || !this.valid;
  }

  submit(): void {
    if (this.disabled) return;
    this.locked = true;
    this.confirmed.emit(this.text.trim());
  }

  close(): void {
    if (this.busy) return;
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
