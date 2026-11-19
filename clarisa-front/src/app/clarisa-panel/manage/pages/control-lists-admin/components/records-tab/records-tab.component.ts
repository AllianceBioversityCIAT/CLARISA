import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { FieldRow, ListDetail, ListRecord, ReloadReason } from '../../models/control-lists.models';
import { readApiError } from '../../utils/api-error';
import { publishedFields, recordIsActive, recordLabel } from '../../utils/record-values';

export type RecordFilter = 'active' | 'inactive' | 'all';

@Component({
  selector: 'app-cl-records-tab',
  templateUrl: './records-tab.component.html'
})
export class RecordsTabComponent implements OnChanges, OnDestroy {
  @Input() detail!: ListDetail;
  /** A record was written: the workspace reads the list again (its record count). */
  @Output() changed = new EventEmitter<ReloadReason>();

  fields: FieldRow[] = [];
  records: ListRecord[] = [];
  /** Records of each related list; `null` when reading it failed. */
  related: Record<string, ListRecord[] | null> = {};
  rows: ListRecord[] = [];

  loading = false;
  loaded = false;
  error: string | null = null;
  filter: RecordFilter = 'active';
  search = '';
  readonly rowsPerPage = [10, 25, 50];
  readonly filters: { id: RecordFilter; label: string }[] = [
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'all', label: 'All' }
  ];

  recordVisible = false;
  statusVisible = false;
  statusMode: 'deactivate' | 'reactivate' = 'deactivate';
  target: ListRecord | null = null;

  private labels: Record<string, Map<number, string>> = {};
  private readonly destroy$ = new Subject<void>();
  private readonly reload$ = new Subject<void>();

  constructor(private api: ControlListsApiService) {}

  get code(): string {
    return this.detail.code;
  }

  get published(): boolean {
    return this.detail.status === 'published';
  }

  get counts(): Record<RecordFilter, number> {
    const active = this.records.filter(recordIsActive).length;
    return { active, inactive: this.records.length - active, all: this.records.length };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['detail']) return;
    const prev = changes['detail'].previousValue as ListDetail | undefined;
    this.fields = publishedFields(this.detail.fields);
    // The data is read again only when the table itself changed (a field added, retyped,
    // renamed or removed, or the list just published); any other reload keeps the rows.
    if (!prev || this.shape(prev) !== this.shape(this.detail)) this.load();
    else this.recompute();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onWritten(reason: ReloadReason = 'saved'): void {
    this.load();
    this.changed.emit(reason);
  }

  load(): void {
    this.reload$.next();
    this.error = null;
    if (!this.published) {
      this.loaded = true;
      this.loading = false;
      this.records = [];
      this.recompute();
      return;
    }
    this.loading = true;
    this.api
      .records(this.code)
      .pipe(
        switchMap(records => {
          const codes = [...new Set(this.fields.filter(f => f.type === 'relation' && f.relation_code).map(f => f.relation_code as string))];
          if (!codes.length) return of({ records, related: {} as Record<string, ListRecord[] | null> });
          return forkJoin(codes.map(c => this.api.records(c).pipe(catchError(() => of(null))))).pipe(
            map(results => ({ records, related: Object.fromEntries(codes.map((c, i) => [c, results[i]])) as Record<string, ListRecord[] | null> }))
          );
        }),
        takeUntil(this.reload$),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ records, related }) => {
          this.records = Array.isArray(records) ? records : [];
          this.related = related;
          this.labels = {};
          for (const [code, rows] of Object.entries(related)) {
            this.labels[code] = new Map((rows ?? []).map(r => [r.id, recordLabel(r)]));
          }
          this.loading = false;
          this.loaded = true;
          this.recompute();
        },
        error: err => {
          this.loading = false;
          this.loaded = true;
          this.error = readApiError(err).message;
        }
      });
  }

  private shape(detail: ListDetail): string {
    const fields = publishedFields(detail.fields).map(f => `${f.id}:${f.code}:${f.type}`);
    return [detail.code, detail.status, ...fields].join('|');
  }

  setFilter(filter: RecordFilter): void {
    this.filter = filter;
    this.recompute();
  }

  recompute(): void {
    const needle = this.search.trim().toLowerCase();
    this.rows = this.records.filter(r => {
      const active = recordIsActive(r);
      if (this.filter === 'active' && !active) return false;
      if (this.filter === 'inactive' && active) return false;
      return !needle || this.searchText(r).includes(needle);
    });
  }

  /** What a cell shows, as plain text (also what the search looks at). */
  display(field: FieldRow, record: ListRecord): string {
    const v = record[field.code];
    if (v === null || v === undefined || v === '') return '—';
    if (field.type === 'boolean') return v === true || v === 1 ? 'Yes' : v === false || v === 0 ? 'No' : '—';
    if (field.type === 'relation') {
      const id = Number(v);
      return this.labels[field.relation_code ?? '']?.get(id) ?? `#${id}`;
    }
    return String(v);
  }

  private searchText(record: ListRecord): string {
    return [String(record.id), ...this.fields.map(f => this.display(f, record))].join(' ').toLowerCase();
  }

  isActive(record: ListRecord): boolean {
    return recordIsActive(record);
  }

  openCreate(): void {
    this.target = null;
    this.recordVisible = true;
  }

  openEdit(record: ListRecord): void {
    this.target = record;
    this.recordVisible = true;
  }

  openStatus(record: ListRecord, mode: 'deactivate' | 'reactivate'): void {
    this.target = record;
    this.statusMode = mode;
    this.statusVisible = true;
  }

  trackRecord(_: number, record: ListRecord): number {
    return record.id;
  }
}
