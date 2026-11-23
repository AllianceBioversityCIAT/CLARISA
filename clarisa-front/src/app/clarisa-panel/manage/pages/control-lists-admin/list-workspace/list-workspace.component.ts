import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { combineLatest, forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { ControlListsApiService } from '../services/control-lists-api.service';
import { FieldTypeOption, ListDetail, ListRow, OwnerRole, ReloadReason } from '../models/control-lists.models';
import { readApiError } from '../utils/api-error';
import { ownerLabel, statusLabel } from '../utils/list-format';
import { CONTROL_LISTS_URL } from '../utils/routes';

export type WorkspaceTab = 'fields' | 'records' | 'endpoint';
export type WorkspaceState = 'loading' | 'ready' | 'missing' | 'error';

export const WORKSPACE_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'fields', label: 'Fields' },
  { id: 'records', label: 'Records' },
  { id: 'endpoint', label: 'Public address' }
];

/** The reference data of the screen that can fail without taking the list down with it. */
export type WorkspacePart = 'types' | 'lists' | 'owners';

const PART_NAME: Record<WorkspacePart, string> = {
  types: 'the field types',
  lists: 'the other lists',
  owners: 'the owner roles'
};

function failedOf(...results: { failed: WorkspacePart | null }[]): WorkspacePart[] {
  return results.map(r => r.failed).filter((f): f is WorkspacePart => f !== null);
}

/** What the screen says when reading the list again fails, by what asked for it. */
export function reloadFailureText(reason: ReloadReason, why: string): string {
  switch (reason) {
    case 'saved':
      return `The change was saved, but the list could not be refreshed. ${why}`;
    case 'unsettled':
      return `The server did not confirm the last change, and the list could not be read again. Check the list before trying that change again. ${why}`;
    case 'check':
      return `The list could not be checked. What is on screen may be out of date. ${why}`;
    default:
      return `The list could not be loaded again. ${why}`;
  }
}

@Component({
  selector: 'app-cl-list-workspace',
  templateUrl: './list-workspace.component.html',
  styleUrls: ['./list-workspace.component.scss']
})
export class ListWorkspaceComponent implements OnInit, OnDestroy {
  readonly tabs = WORKSPACE_TABS;
  readonly url = CONTROL_LISTS_URL;
  readonly statusLabel = statusLabel;

  state: WorkspaceState = 'loading';
  errorMessage = '';
  detail: ListDetail | null = null;
  lists: ListRow[] = [];
  types: FieldTypeOption[] = [];
  owners: OwnerRole[] = [];
  tab: WorkspaceTab = 'fields';
  publishVisible = false;
  /** «Edit list details» is open. */
  editVisible = false;
  /** The list is being read again after a write: what is on screen may not show it yet. */
  refreshing = false;
  /** What of the reference data could not be read; the screen stays usable without it. */
  failedParts: WorkspacePart[] = [];

  /** `-1` until the route says which list: id 0 must still load (and say «not found»). */
  private id = -1;
  private readonly destroy$ = new Subject<void>();
  private readonly restart$ = new Subject<void>();

  constructor(
    private api: ControlListsApiService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: MessageService
  ) {}

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([params, query]) => {
        const requested = query.get('tab');
        this.tab = this.tabs.some(t => t.id === requested) ? (requested as WorkspaceTab) : 'fields';
        const raw = params.get('id') ?? '';
        // Only digits: `Number()` also reads `0x10` and `1e1`, and NaN never equals itself.
        const id = /^\d+$/.test(raw) ? Number(raw) : 0;
        if (id !== this.id) {
          this.id = id;
          this.load();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get ownerName(): string {
    return this.detail ? ownerLabel(this.owners, this.detail.owner_role_id) : '';
  }

  get published(): boolean {
    return this.detail?.status === 'published';
  }

  get partsText(): string {
    return this.failedParts.map(p => PART_NAME[p]).join(', ');
  }

  has(part: WorkspacePart): boolean {
    return this.failedParts.includes(part);
  }

  load(): void {
    this.restart$.next();
    if (!Number.isInteger(this.id) || this.id <= 0) {
      this.state = 'missing';
      return;
    }
    this.state = 'loading';
    this.detail = null;
    this.refreshing = false;
    forkJoin({
      detail: this.api.list(this.id),
      lists: this.soft('lists', this.api.lists(), []),
      types: this.soft('types', this.api.types(), []),
      owners: this.soft('owners', this.api.owners(), [])
    })
      .pipe(takeUntil(this.restart$), takeUntil(this.destroy$))
      .subscribe({
        next: ({ detail, lists, types, owners }) => {
          this.detail = detail;
          this.lists = lists.value;
          this.types = types.value;
          this.owners = owners.value;
          this.failedParts = failedOf(lists, types, owners);
          this.state = 'ready';
        },
        error: err => {
          const info = readApiError(err);
          this.errorMessage = info.message;
          this.state = info.status === 404 || info.status === 403 ? 'missing' : 'error';
        }
      });
  }

  /** One piece of reference data: a failure gives the fallback and names what failed, so the screen can say so. */
  private soft<T>(part: WorkspacePart, call: Observable<T[]>, fallback: T[]): Observable<{ value: T[]; failed: WorkspacePart | null }> {
    return call.pipe(
      map(value => ({ value, failed: null })),
      catchError(() => of({ value: fallback, failed: part }))
    );
  }

  /**
   * Read the list again from the server (after a write, a recheck or a retry).
   * What is on screen stays until the answer comes, marked as updating; if that
   * read fails, `reason` decides what the toast says. The list being gone or
   * not ours any more (404/403) is not a failed refresh: the screen says so.
   */
  reload(reason: ReloadReason = 'saved'): void {
    this.restart$.next();
    this.refreshing = true;
    // The reference data is read again only when it failed before: it does not change with a write.
    const again = (part: WorkspacePart): boolean => this.has(part);
    forkJoin({
      detail: this.api.list(this.id),
      lists: this.soft('lists', this.api.lists(), this.lists),
      types: again('types') ? this.soft('types', this.api.types(), this.types) : of({ value: this.types, failed: null }),
      owners: again('owners') ? this.soft('owners', this.api.owners(), this.owners) : of({ value: this.owners, failed: null })
    })
      .pipe(takeUntil(this.restart$), takeUntil(this.destroy$))
      .subscribe({
        next: ({ detail, lists, types, owners }) => {
          this.detail = detail;
          this.lists = lists.value;
          this.types = types.value;
          this.owners = owners.value;
          this.failedParts = failedOf(lists, types, owners);
          this.refreshing = false;
        },
        error: err => {
          this.refreshing = false;
          const info = readApiError(err);
          if (info.status === 404 || info.status === 403) {
            this.detail = null;
            this.state = 'missing';
            return;
          }
          this.toast.add({ severity: 'warn', summary: 'Not refreshed', detail: reloadFailureText(reason, info.message) });
        }
      });
  }

  /** Roving tabindex: only the current tab is a tab stop; the others are reached with the arrows. */
  tabIndex(tab: WorkspaceTab): number {
    return tab === this.tab ? 0 : -1;
  }

  /** Left/Right (wrapping), Home and End move to a tab and open it, as in any tablist. */
  onTabKey(event: KeyboardEvent, index: number): void {
    const last = this.tabs.length - 1;
    const target =
      event.key === 'ArrowRight'
        ? index >= last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index <= 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1;
    if (target < 0) return;
    event.preventDefault();
    const id = this.tabs[target].id;
    this.setTab(id);
    // The tab is a button of the same row: the keyboard follows the selection.
    (event.currentTarget as HTMLElement | null)?.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[target]?.focus();
  }

  /** «Retry» of the notice about reference data that could not be read. */
  retryParts(): void {
    this.reload('retry');
  }

  setTab(tab: WorkspaceTab): void {
    if (tab === this.tab) return;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge' });
  }

  onListDeleted(): void {
    this.router.navigate([this.url]);
  }
}
