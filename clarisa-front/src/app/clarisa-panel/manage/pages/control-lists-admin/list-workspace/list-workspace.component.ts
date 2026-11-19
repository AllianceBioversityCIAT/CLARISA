import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { combineLatest, forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { ControlListsApiService } from '../services/control-lists-api.service';
import { FieldTypeOption, ListDetail, ListRow, OwnerRole } from '../models/control-lists.models';
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

@Component({
  selector: 'app-cl-list-workspace',
  templateUrl: './list-workspace.component.html'
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

  load(): void {
    this.restart$.next();
    if (!Number.isInteger(this.id) || this.id <= 0) {
      this.state = 'missing';
      return;
    }
    this.state = 'loading';
    this.detail = null;
    forkJoin({
      detail: this.api.list(this.id),
      lists: this.api.lists().pipe(catchError(() => of([] as ListRow[]))),
      types: this.api.types().pipe(catchError(() => of([] as FieldTypeOption[]))),
      owners: this.api.owners().pipe(catchError(() => of([] as OwnerRole[])))
    })
      .pipe(takeUntil(this.restart$), takeUntil(this.destroy$))
      .subscribe({
        next: ({ detail, lists, types, owners }) => {
          this.detail = detail;
          this.lists = lists;
          this.types = types;
          this.owners = owners;
          this.state = 'ready';
        },
        error: err => {
          const info = readApiError(err);
          this.errorMessage = info.message;
          this.state = info.status === 404 || info.status === 403 ? 'missing' : 'error';
        }
      });
  }

  /** After a write: read the list again from the server; keep what is on screen if that fails. */
  reload(): void {
    this.restart$.next();
    forkJoin({ detail: this.api.list(this.id), lists: this.api.lists().pipe(catchError(() => of(this.lists))) })
      .pipe(takeUntil(this.restart$), takeUntil(this.destroy$))
      .subscribe({
        next: ({ detail, lists }) => {
          this.detail = detail;
          this.lists = lists;
        },
        error: err =>
          this.toast.add({
            severity: 'warn',
            summary: 'Not refreshed',
            detail: `The change was saved, but the list could not be refreshed. ${readApiError(err).message}`
          })
      });
  }

  setTab(tab: WorkspaceTab): void {
    if (tab === this.tab) return;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge' });
  }

  onListDeleted(): void {
    this.router.navigate([this.url]);
  }
}
