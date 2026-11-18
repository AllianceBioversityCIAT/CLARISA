import { Directive, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiErrorInfo, readApiError } from '../utils/api-error';
import { newRequestId } from '../utils/request-id';

export const UNKNOWN_OUTCOME = 'The change may still have been applied: check the list before trying again.';

/**
 * What every write dialog of the module shares: it opens with a fresh
 * `request_id` (kept for retries of that same opening), locks while its request
 * is open, and on a 4xx keeps itself open showing the back's message.
 */
@Directive()
export abstract class WriteDialogBase<R = void> implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  /** Emitted after a successful write, so the parent reloads from the server. */
  @Output() done = new EventEmitter<R>();
  /** The write failed in a way that leaves its outcome unknown: the parent reads the data again. */
  @Output() unsettled = new EventEmitter<void>();

  saving = false;
  /** This opening already wrote: Enter during the closing animation must not write again. */
  private finished = false;
  error: string | null = null;
  protected requestId = '';
  protected readonly destroy$ = new Subject<void>();

  constructor(protected toast: MessageService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.saving = false;
      this.finished = false;
      this.error = null;
      this.requestId = newRequestId();
      this.onOpen();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Reset the dialog's own fields from its inputs. */
  protected onOpen(): void {}

  /** Return `true` when the error was handled and must not show as the generic message. */
  protected onWriteError(_info: ApiErrorInfo): boolean {
    return false;
  }

  /** Dismiss from the header or the mask: ignored while a request is open. */
  onVisibleChange(open: boolean): void {
    if (!open) this.close();
  }

  close(): void {
    if (this.saving) return;
    this.visible = false;
    this.visibleChange.emit(false);
  }

  protected success(summary: string, detail: string): void {
    this.toast.add({ severity: 'success', summary, detail });
  }

  /** Runs one write. A second call while the first is open does nothing. */
  protected write(call: () => Observable<R>, onSuccess: (result: R) => void): void {
    if (this.saving || this.finished) return;
    this.saving = true;
    this.error = null;
    call()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.saving = false;
          this.finished = true;
          onSuccess(result);
          this.visible = false;
          this.visibleChange.emit(false);
          this.done.emit(result);
        },
        error: err => {
          this.saving = false;
          const info = readApiError(err);
          if (!this.onWriteError(info)) {
            this.error = info.status === 409 || !info.unsettled ? info.message : `${info.message} ${UNKNOWN_OUTCOME}`;
          }
          if (info.unsettled) this.unsettled.emit();
        }
      });
  }
}
