import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { FieldRow, FieldTypeOption, ListDetail, ListRow, ReloadReason } from '../../models/control-lists.models';
import { relationTargets } from '../../utils/list-format';
import { isOn } from '../../utils/record-values';
import { readApiError } from '../../utils/api-error';
import { typeName } from '../../utils/field-types';
import { filterableBy } from '../../utils/field-rules';
import { CONTROL_LISTS_URL } from '../../utils/routes';

@Component({
  selector: 'app-cl-fields-tab',
  templateUrl: './fields-tab.component.html'
})
export class FieldsTabComponent implements OnChanges, OnDestroy {
  @Input() detail!: ListDetail;
  @Input() types: FieldTypeOption[] = [];
  @Input() lists: ListRow[] = [];
  /** The parent reloads the list from the server; `reason` says why, so a failed reload is reported truthfully. */
  @Output() changed = new EventEmitter<ReloadReason>();
  /** The lists of this user could not be read: the Add field dialog says it cannot check codes. */
  @Input() listsFailed = false;
  @Output() listDeleted = new EventEmitter<void>();

  readonly isOn = isOn;
  readonly typeName = typeName;
  readonly url = CONTROL_LISTS_URL;
  /** Codes of the lists this user sees; a new options list needs a free one. */
  takenCodes: string[] = [];

  addVisible = false;
  renameVisible = false;
  typeVisible = false;
  rulesVisible = false;
  deleteFieldVisible = false;
  deleteListVisible = false;
  target: FieldRow | null = null;

  sqlOpen = false;
  sql: string | null = null;
  sqlLoading = false;
  sqlError: string | null = null;
  private sqlSub?: Subscription;

  constructor(private api: ControlListsApiService) {}

  get published(): boolean {
    return this.detail.status === 'published';
  }

  /** A change to the list is still being applied: no writes until it ends. */
  get locked(): boolean {
    return this.detail.pending_changes > 0;
  }

  get targets(): ListRow[] {
    return relationTargets(this.lists, this.detail);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['lists']) this.takenCodes = this.lists.map(l => l.code);
    // A reload brings new field objects: an open dialog reads the stored values of now, not of when it opened.
    if (changes['detail'] && this.target) {
      const id = this.target.id;
      this.target = this.detail.fields.find(f => f.id === id) ?? this.target;
    }
    // The definition changes after every schema write: refresh it while it is open.
    if (changes['detail'] && !changes['detail'].firstChange && this.sqlOpen) this.loadSql();
  }

  ngOnDestroy(): void {
    this.sqlSub?.unsubscribe();
  }

  /** The public address can filter by this field: it is unique, filterable or a relation (the dialog says the same). */
  filterable(field: FieldRow): boolean {
    return filterableBy(field.type, isOn(field.is_unique), isOn(field.is_indexed));
  }

  openAdd(): void {
    this.addVisible = true;
  }

  openRename(field: FieldRow): void {
    this.target = field;
    this.renameVisible = true;
  }

  openType(field: FieldRow): void {
    this.target = field;
    this.typeVisible = true;
  }

  openRules(field: FieldRow): void {
    this.target = field;
    this.rulesVisible = true;
  }

  openDeleteField(field: FieldRow): void {
    this.target = field;
    this.deleteFieldVisible = true;
  }

  toggleSql(): void {
    this.sqlOpen = !this.sqlOpen;
    if (this.sqlOpen) this.loadSql();
  }

  private loadSql(): void {
    this.sqlSub?.unsubscribe();
    this.sqlLoading = true;
    this.sqlError = null;
    this.sqlSub = this.api.sql(this.detail.id).subscribe({
      next: res => {
        this.sql = res?.sql ?? null;
        this.sqlLoading = false;
      },
      error: err => {
        this.sqlError = readApiError(err).message;
        this.sqlLoading = false;
      }
    });
  }

  trackField(_: number, field: FieldRow): number {
    return field.id;
  }
}
