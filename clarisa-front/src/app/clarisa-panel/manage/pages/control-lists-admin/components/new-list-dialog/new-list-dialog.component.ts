import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { ListRow, OwnerRole } from '../../models/control-lists.models';
import { codeProblem, isUsableCode, suggestCode } from '../../utils/code-suggest';
import { LIMITS } from '../../utils/limits';
import { WriteDialogBase } from '../write-dialog.base';

@Component({
  selector: 'app-cl-new-list-dialog',
  templateUrl: './new-list-dialog.component.html',
  styleUrls: ['./new-list-dialog.component.scss']
})
export class NewListDialogComponent extends WriteDialogBase<ListRow> {
  @Input() owners: OwnerRole[] = [];
  /** The last read of the roles failed: the dialog cannot offer the owner, and says so. */
  @Input() ownersFailed = false;
  /** The roles are being read again. */
  @Input() ownersLoading = false;
  /** «Retry» on the note about the roles: the parent reads them again. */
  @Output() retryOwners = new EventEmitter<void>();

  readonly limits = LIMITS;
  name = '';
  code = '';
  description = '';
  ownerId: number | null = null;
  /** Once the user types in the code, it stops following the name. */
  private codeEdited = false;
  /** «Retry» was pressed in this opening. */
  private retried = false;
  /** A Retry ended in failure again: the note changes its words so a screen reader hears it. */
  stillFailing = false;

  constructor(
    private api: ControlListsApiService,
    toast: MessageService
  ) {
    super(toast);
  }

  protected override onOpen(): void {
    this.name = '';
    this.code = '';
    this.description = '';
    this.codeEdited = false;
    this.ownerId = this.owners.length === 1 ? this.owners[0].id : null;
    this.retried = false;
    this.stillFailing = false;
  }

  override ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if (changes['visible']) return;
    const retryEnded = changes['ownersLoading']?.previousValue === true && !this.ownersLoading;
    if (retryEnded && this.retried && this.ownersFailed && !this.owners.length) this.stillFailing = true;
    const arrived = !!changes['owners'] && !(changes['owners'].previousValue ?? []).length && this.owners.length > 0;
    if (!arrived) return;
    // The roles arrived while the dialog was open: one role is the owner, as on opening.
    if (this.ownerId === null && this.owners.length === 1) this.ownerId = this.owners[0].id;
    this.stillFailing = false;
    // The focused «Retry» is gone with its note: the keyboard goes to what comes next.
    if (this.retried) this.focusAfterRetry();
  }

  /** «Retry» on the note: the parent reads the roles again. */
  onRetry(): void {
    this.retried = true;
    this.retryOwners.emit();
  }

  private focusAfterRetry(): void {
    if (typeof document === 'undefined') return;
    const target = this.owners.length > 1 ? 'cl-new-owner' : 'cl-new-name';
    setTimeout(() => document.getElementById(target)?.focus());
  }

  /** No roles to choose from because reading them failed (or is being retried): Create waits for them. */
  get ownersUnknown(): boolean {
    return this.owners.length === 0 && (this.ownersFailed || this.ownersLoading);
  }

  get singleOwner(): OwnerRole | null {
    return this.owners.length === 1 ? this.owners[0] : null;
  }

  /** Why the code cannot be used (wrong shape, or a word the back keeps for itself), or `''`. */
  get codeError(): string {
    return codeProblem(this.code, 'list');
  }

  get codeInvalid(): boolean {
    return this.codeError !== '';
  }

  /** With several roles the back cannot guess the owner: it answers 400 until one is chosen. */
  get ownerMissing(): boolean {
    return this.owners.length > 1 && this.ownerId === null;
  }

  get valid(): boolean {
    return this.name.trim() !== '' && isUsableCode(this.code, 'list') && !this.ownerMissing && !this.ownersUnknown;
  }

  protected override isDirty(): boolean {
    return this.name.trim() !== '' || this.code !== '' || this.description.trim() !== '';
  }

  get address(): string {
    return this.api.publicUrl(this.code || '<code>');
  }

  onNameChange(): void {
    if (!this.codeEdited) this.code = suggestCode(this.name, 'list');
  }

  onCodeChange(): void {
    // Clearing the code hands it back to the name.
    this.codeEdited = this.code !== '';
    if (!this.codeEdited) this.code = suggestCode(this.name, 'list');
  }

  submit(): void {
    if (this.saving || !this.valid) return;
    const description = this.description.trim();
    this.write(
      () =>
        this.api.createList({
          code: this.code,
          name: this.name.trim(),
          ...(description ? { description } : {}),
          ...(this.ownerId !== null ? { owner_role_id: this.ownerId } : {})
        }),
      list => this.success('List created', `"${list.name}" is a draft. Add its fields and publish it.`)
    );
  }
}
