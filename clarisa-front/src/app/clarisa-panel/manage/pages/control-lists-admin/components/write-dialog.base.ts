import { Directive, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiErrorInfo, readApiError } from '../utils/api-error';
import { newRequestId } from '../utils/request-id';

/** PrimeNG overlays that Escape closes on their own: a dropdown, a popup calendar, a multiselect, an autocomplete. */
export const OVERLAY_SELECTOR = '.p-dropdown-panel, .p-datepicker:not(.p-datepicker-inline), .p-multiselect-panel, .p-autocomplete-panel';

/** JSON with the keys of every object sorted: the same content always gives the same text. */
export function stableKey(value: unknown): string {
  return (
    JSON.stringify(value, (_key, v: unknown) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.keys(v as Record<string, unknown>)
            // Code-unit order, not the locale's: the same content must give the same key in every browser.
            .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
            .reduce<Record<string, unknown>>((out, k) => ((out[k] = (v as Record<string, unknown>)[k]), out), {})
        : v
    ) ?? 'undefined'
  );
}

export const UNKNOWN_OUTCOME = 'The change may still have been applied: check the list before trying again.';

/**
 * What every write dialog of the module shares: it opens with a fresh
 * `request_id` (kept for retries of that same opening), locks while its request
 * is open, and on a 4xx keeps itself open showing the back's message. Closing
 * it with typed content asks first (`isDirty`), and when it closes the keyboard
 * goes back to what opened it.
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
  /** A close was asked while there is typed content: the «Discard your changes?» bar shows. */
  confirmingClose = false;
  /** What had the keyboard when the dialog opened: it gets it back when the dialog closes. */
  private opener: HTMLElement | null = null;
  /**
   * One `request_id` per CONTENT within an opening: a true retry of the same body carries the
   * same id (the back recognises it and does not write twice), and an edited body gets a new
   * one (the back would otherwise answer the first result and drop the new content).
   */
  private requestIds = new Map<string, string>();
  /** This Escape was meant for an open overlay (a dropdown, a calendar): the dialog must not take it too. */
  private escapeForOverlay = false;
  protected readonly destroy$ = new Subject<void>();

  constructor(protected toast: MessageService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.saving = false;
      this.finished = false;
      this.error = null;
      this.confirmingClose = false;
      this.opener = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
      this.requestIds = new Map();
      this.onOpen();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** The id of this content in this opening: the same content always gets the same id until the dialog opens again. */
  protected requestIdFor(content: unknown): string {
    const key = stableKey(content);
    let id = this.requestIds.get(key);
    if (!id) {
      id = newRequestId();
      this.requestIds.set(key, id);
    }
    return id;
  }

  /** Reset the dialog's own fields from its inputs. */
  protected onOpen(): void {}

  /** Typed content that closing would lose. Dialogs that hold some say when; the rest close at once. */
  protected isDirty(): boolean {
    return false;
  }

  /** Return `true` when the error was handled and must not show as the generic message. */
  protected onWriteError(_info: ApiErrorInfo): boolean {
    return false;
  }

  /**
   * Any Escape on the page: if a PrimeNG overlay is open at that moment, that overlay is
   * what it closes. The note lasts until the next macrotask, long enough for the dialog's
   * own Escape handler of the same key press to see it.
   */
  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (typeof document === 'undefined' || !document.querySelector(OVERLAY_SELECTOR)) return;
    this.escapeForOverlay = true;
    setTimeout(() => (this.escapeForOverlay = false));
  }

  /** Dismiss from the header or Escape: ignored while a request is open, and when the Escape closed an overlay. */
  onVisibleChange(open: boolean): void {
    if (open) return;
    if (this.escapeForOverlay) return;
    this.close();
  }

  /**
   * A request to close (X, Cancel, Escape). With typed content the dialog stays
   * open and asks; asking again while the question shows (a second Escape) keeps
   * editing. Never while saving, and never once the write went through.
   */
  close(): void {
    if (this.saving) return;
    if (this.isDirty() && !this.finished) {
      this.confirmingClose = !this.confirmingClose;
      return;
    }
    this.hide();
  }

  /** «Discard» on the bar. */
  discard(): void {
    if (this.saving) return;
    this.hide();
  }

  /** «Keep editing» on the bar. */
  keepEditing(): void {
    this.confirmingClose = false;
  }

  private hide(): void {
    this.confirmingClose = false;
    this.visible = false;
    this.visibleChange.emit(false);
    this.restoreFocus();
  }

  /**
   * After the closing animation: the dialog's own buttons are gone, so the opener is the next
   * stop. When the opener left the page (an empty-state button that vanished once records
   * exist), the selected tab of the workspace takes the keyboard instead of the page body.
   */
  private restoreFocus(): void {
    const opener = this.opener;
    this.opener = null;
    if (!opener || typeof document === 'undefined') return;
    setTimeout(() => {
      if (opener === document.body) return;
      if (document.contains(opener)) {
        opener.focus();
        return;
      }
      document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
    });
  }

  protected success(summary: string, detail: string): void {
    this.toast.add({ severity: 'success', summary, detail });
  }

  /** Runs one write. A second call while the first is open does nothing. */
  protected write(call: () => Observable<R>, onSuccess: (result: R) => void): void {
    if (this.saving || this.finished) return;
    this.saving = true;
    this.error = null;
    this.confirmingClose = false;
    call()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.saving = false;
          this.finished = true;
          onSuccess(result);
          this.hide();
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
