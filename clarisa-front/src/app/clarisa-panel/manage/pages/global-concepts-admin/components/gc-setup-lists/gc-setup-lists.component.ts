import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { AdminListValue, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { groupListValues, ListGroup, reorderPatches } from '../../utils/setup-fields';
import { FIELD_INFO } from '../../utils/field-info';
import { StableOptions } from '../../utils/stable-options';

/** The controlled lists the scheme sees, one list at a time. */
@Component({
  selector: 'app-gc-setup-lists',
  templateUrl: './gc-setup-lists.component.html',
  styleUrls: ['./gc-setup-lists.component.scss']
})
export class GcSetupListsComponent implements OnInit, OnChanges {
  readonly info = FIELD_INFO.setupList;
  @Input() scheme = 'concepts';
  /** The list codes, for the field form of the sibling section. */
  @Output() listCodes = new EventEmitter<string[]>();

  loading = false;
  loadError: string | null = null;
  groups: ListGroup<AdminListValue>[] = [];
  selected: string | null = null;

  /** One write at a time across the section: reorders touch several rows. */
  busy: string | null = null;
  error: string | null = null;

  editingId: number | null = null;
  editLabel = '';

  newLabel = '';
  newValue = '';
  newShared = false;

  creatingList = false;
  newListCode = '';
  newListLabel = '';

  constructor(private readonly _api: GlobalConceptsApiService, private readonly _messageService: MessageService) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scheme'] && !changes['scheme'].firstChange) this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = null;
    this._api.adminLists(this.scheme).subscribe({
      next: values => {
        this.loading = false;
        this.groups = groupListValues(Array.isArray(values) ? values : []);
        this.listCodes.emit(this.groups.map(group => group.code));
        if (!this.selected || !this.groups.some(group => group.code === this.selected)) this.selected = this.groups[0]?.code ?? null;
      },
      error: error => {
        this.loading = false;
        this.loadError = apiErrorMessage(error, 'The controlled lists could not be loaded');
      }
    });
  }

  private readonly _listOptions = new StableOptions<{ label: string; value: string }>();

  get listOptions(): { label: string; value: string }[] {
    return this._listOptions.get([this.groups, ...this.groups.map(group => `${group.code}:${group.active}`)], () =>
      this.groups.map(group => ({ label: `${group.code} (${group.active})`, value: group.code }))
    );
  }

  get group(): ListGroup<AdminListValue> | null {
    return this.groups.find(group => group.code === this.selected) ?? null;
  }

  private done(message: string): void {
    this.busy = null;
    this._messageService.add({ severity: 'success', summary: 'List updated', detail: message });
    this.load();
  }

  private fail(error: unknown, fallback: string): void {
    this.busy = null;
    this.error = apiErrorMessage(error, fallback);
  }

  addValue(): void {
    const group = this.group;
    const label = this.newLabel.trim();
    if (!group || !label || this.busy) return;
    this.busy = 'add';
    this.error = null;
    const body: { list_code: string; label: string; value?: string; shared?: boolean } = { list_code: group.code, label };
    if (this.newValue.trim()) body.value = this.newValue.trim();
    if (this.newShared) body.shared = true;
    this._api.addListValue(this.scheme, body).subscribe({
      next: value => {
        this.newLabel = '';
        this.newValue = '';
        this.newShared = false;
        this.done(`“${value?.label ?? label}” added to ${group.code} as ${value?.value ?? 'a new value'}.`);
      },
      error: error => this.fail(error, 'The value could not be added')
    });
  }

  startRelabel(value: AdminListValue): void {
    this.editingId = value.id;
    this.editLabel = value.label;
  }

  saveRelabel(value: AdminListValue): void {
    const label = this.editLabel.trim();
    if (this.busy || !label) return;
    if (label === value.label) {
      this.editingId = null;
      return;
    }
    this.busy = `label:${value.id}`;
    this.error = null;
    this._api.updateListValue(this.scheme, value.id, { label }).subscribe({
      next: () => {
        this.editingId = null;
        this.done(`${value.value} now reads “${label}”.`);
      },
      error: error => this.fail(error, 'The label could not be changed')
    });
  }

  toggleActive(value: AdminListValue): void {
    if (this.busy) return;
    this.busy = `active:${value.id}`;
    this.error = null;
    this._api.updateListValue(this.scheme, value.id, { is_active: !value.is_active }).subscribe({
      next: () => this.done(`${value.value} ${value.is_active ? 'deactivated: concepts keep it, new ones cannot pick it' : 'reactivated'}.`),
      error: error => this.fail(error, 'The value could not be changed')
    });
  }

  move(index: number, delta: -1 | 1): void {
    const group = this.group;
    if (!group || this.busy) return;
    const patches = reorderPatches(group.values, index, delta);
    if (!patches.length) return;
    this.busy = 'order';
    this.error = null;
    forkJoin(patches.map(patch => this._api.updateListValue(this.scheme, patch.id, { sort: patch.sort }))).subscribe({
      next: () => this.done(`${group.code} reordered.`),
      error: error => {
        this.fail(error, 'The order could not be saved');
        // Part of the reorder may have landed: show what is stored.
        this.load();
      }
    });
  }

  createList(): void {
    const code = this.newListCode.trim().toLowerCase();
    const label = this.newListLabel.trim();
    if (!code || !label || this.busy) return;
    if (!/^[a-z][a-z0-9_]{0,49}$/.test(code)) {
      this.error = 'A list code is lower-case letters, digits and _, starting with a letter.';
      return;
    }
    this.busy = 'list';
    this.error = null;
    this._api.addListValue(this.scheme, { list_code: code, label, new_list: true }).subscribe({
      next: () => {
        this.selected = code;
        this.creatingList = false;
        this.newListCode = '';
        this.newListLabel = '';
        this.done(`List ${code} started with “${label}”.`);
      },
      error: error => this.fail(error, 'The list could not be created')
    });
  }

  isBusy(key: string): boolean {
    return this.busy === key;
  }
}
