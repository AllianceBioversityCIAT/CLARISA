import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { ControlListsApiService } from '../services/control-lists-api.service';
import { ListCounts, ListRow, OwnerRole } from '../models/control-lists.models';
import { readApiError } from '../utils/api-error';
import { ownerLabel, relationCount, shortDate, statusLabel } from '../utils/list-format';
import { CONTROL_LISTS_URL } from '../utils/routes';

export type ListsState = 'loading' | 'ready' | 'off' | 'forbidden' | 'error';

export interface ListViewRow extends ListRow {
  /** `undefined` while its detail loads, `null` when it failed. */
  counts?: ListCounts | null;
}

@Component({
  selector: 'app-cl-lists-screen',
  templateUrl: './lists-screen.component.html'
})
export class ListsScreenComponent implements OnInit, OnDestroy {
  state: ListsState = 'loading';
  errorMessage = '';
  rows: ListViewRow[] = [];
  owners: OwnerRole[] = [];
  newVisible = false;
  readonly url = CONTROL_LISTS_URL;
  readonly statusLabel = statusLabel;
  readonly shortDate = shortDate;
  readonly rowsPerPage = [10, 25, 50];

  private readonly destroy$ = new Subject<void>();
  private readonly restart$ = new Subject<void>();

  constructor(
    private api: ControlListsApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openNew(): void {
    this.newVisible = true;
    if (this.owners.length) return;
    // The first read of the roles failed: without them a user with several roles cannot choose the owner.
    this.api
      .owners()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: owners => (this.owners = owners), error: () => undefined });
  }

  load(): void {
    this.restart$.next();
    this.state = 'loading';
    forkJoin({ lists: this.api.lists(), owners: this.api.owners().pipe(catchError(() => of([] as OwnerRole[]))) })
      .pipe(takeUntil(this.restart$), takeUntil(this.destroy$))
      .subscribe({
        next: ({ lists, owners }) => {
          this.owners = owners;
          this.rows = (Array.isArray(lists) ? lists : []).map(l => ({ ...l }));
          this.state = 'ready';
          this.loadCounts();
        },
        error: err => {
          const info = readApiError(err);
          this.errorMessage = info.message;
          this.state = info.status === 404 ? 'off' : info.status === 403 ? 'forbidden' : 'error';
        }
      });
  }

  /** Fields, records and relations of each list, after the table is already on screen. */
  private loadCounts(): void {
    if (!this.rows.length) return;
    const rows = this.rows;
    forkJoin(
      rows.map(r =>
        this.api.list(r.id).pipe(
          map(d => ({ fields: d.fields.length, records: d.rows, relations: relationCount(d.fields) }) as ListCounts | null),
          catchError(() => of(null))
        )
      )
    )
      .pipe(takeUntil(this.restart$), takeUntil(this.destroy$))
      .subscribe(counts => rows.forEach((r, i) => (r.counts = counts[i])));
  }

  owner(row: ListRow): string {
    return ownerLabel(this.owners, row.owner_role_id);
  }

  open(row: ListRow): void {
    this.router.navigate([this.url, row.id]);
  }

  onCreated(list: ListRow): void {
    this.router.navigate([this.url, list.id]);
  }

  trackRow(_: number, row: ListRow): number {
    return row.id;
  }
}
