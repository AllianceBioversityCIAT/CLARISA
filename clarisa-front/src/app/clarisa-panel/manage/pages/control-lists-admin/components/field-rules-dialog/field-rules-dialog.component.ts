import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { FieldRow, FieldRulesBody } from '../../models/control-lists.models';
import { cannotIndex, filterableBy, RULE_HINTS } from '../../utils/field-rules';
import { isOn } from '../../utils/record-values';
import { WriteDialogBase } from '../write-dialog.base';

/** «Change rules»: Required, Unique and Filterable of a field that already exists. */
@Component({
  selector: 'app-cl-field-rules-dialog',
  templateUrl: './field-rules-dialog.component.html',
  styleUrls: ['./field-rules-dialog.component.scss']
})
export class FieldRulesDialogComponent extends WriteDialogBase<FieldRow> {
  @Input() field: FieldRow | null = null;
  /** The list and the field are published: the change alters the table, and the dialog says what that means. */
  @Input() published = false;

  readonly hints = RULE_HINTS;
  isRequired = false;
  isUnique = false;
  isIndexed = false;

  constructor(
    private api: ControlListsApiService,
    toast: MessageService
  ) {
    super(toast);
  }

  protected override onOpen(): void {
    this.isRequired = this.storedRequired;
    // Long text cannot hold either. `isIndexed` is the person's own value; what the switch shows is `indexedShown`.
    this.isUnique = !this.longText && this.storedUnique;
    this.isIndexed = !this.longText && this.storedIndexed;
  }

  get header(): string {
    return `Rules of “${this.field?.label ?? ''}”`;
  }

  get isRelation(): boolean {
    return this.field?.type === 'relation';
  }

  get longText(): boolean {
    return cannotIndex(this.field?.type);
  }

  get storedRequired(): boolean {
    return isOn(this.field?.is_required);
  }

  get storedUnique(): boolean {
    return isOn(this.field?.is_unique);
  }

  get storedIndexed(): boolean {
    return isOn(this.field?.is_indexed);
  }

  /** A relation and a unique field always filter: the switch shows it on, whatever the flag says. */
  get indexedForced(): boolean {
    return this.isRelation || (this.isUnique && !this.longText);
  }

  /** What the Filterable switch shows. */
  get indexedShown(): boolean {
    return this.indexedForced || (!this.longText && this.isIndexed);
  }

  /** Filterable cannot be switched: a relation or a unique field always is a filter, long text never is. */
  get indexedLocked(): boolean {
    return this.indexedForced || this.longText;
  }

  get indexedHint(): string {
    if (this.isRelation) return this.hints.relationFilter;
    if (this.longText) return this.hints.longText;
    return this.isUnique ? this.hints.uniqueFilter : this.hints.indexed;
  }

  /** The switch of Filterable, when it is free: the person's own value. */
  setIndexed(on: boolean): void {
    if (!this.indexedLocked) this.isIndexed = on;
  }

  /** What travels: the person's own (or stored) Filterable, never the forced display. */
  private get next(): Omit<FieldRulesBody, 'request_id'> {
    return {
      is_required: this.isRequired,
      is_unique: this.longText ? false : this.isUnique,
      is_indexed: this.longText ? false : this.isIndexed
    };
  }

  get changed(): boolean {
    if (!this.field) return false;
    const n = this.next;
    return n.is_required !== this.storedRequired || n.is_unique !== this.storedUnique || n.is_indexed !== this.storedIndexed;
  }

  get requiredTurnedOn(): boolean {
    return this.published && this.isRequired && !this.storedRequired;
  }

  get uniqueTurnedOn(): boolean {
    return this.published && this.next.is_unique && !this.storedUnique;
  }

  /** Applications filtering by this field would start getting an error: it was a filter and stops being one. */
  get stopsFiltering(): boolean {
    if (!this.published || !this.field || this.isRelation) return false;
    const type = this.field.type;
    const n = this.next;
    return filterableBy(type, this.storedUnique, this.storedIndexed) && !filterableBy(type, n.is_unique, n.is_indexed);
  }

  /** Turning Unique off is what ends the filter: the warning says how to keep it. */
  get uniqueEndsFilter(): boolean {
    return this.stopsFiltering && this.storedUnique && !this.next.is_unique;
  }

  protected override isDirty(): boolean {
    return this.changed;
  }

  submit(): void {
    if (this.saving || !this.changed || !this.field) return;
    const id = this.field.id;
    const next = this.next;
    const body: FieldRulesBody = { ...next, request_id: this.requestIdFor({ fieldId: id, ...next }) };
    this.write(
      () => this.api.setFieldRules(id, body),
      field => this.success('Rules updated', `The rules of "${field?.label ?? this.field?.label}" were saved.`)
    );
  }
}
