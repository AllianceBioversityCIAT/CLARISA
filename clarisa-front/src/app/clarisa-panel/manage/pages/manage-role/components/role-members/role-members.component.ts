import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { AccessAdminApiService, AccessRole, AccessUser, countOf } from '../../../../../../shared/services/access-admin/access-admin-api.service';
import { accessErrorMessage, fullName } from '../../../../../../shared/services/access-admin/access-rules';
import { ACCESS_INFO } from '../../../../components/access/access-field-info';
import { PickedUser } from '../../../../components/access/user-picker/user-picker.component';

/**
 * Who holds one role: paged by the server, searchable, with a bulk «Add
 * members» and a removal that asks why. Read-only for a locked role.
 */
@Component({
  selector: 'app-role-members',
  templateUrl: './role-members.component.html'
})
export class RoleMembersComponent implements OnInit, OnDestroy {
  @Input() role!: AccessRole;
  @Input() readOnly = false;
  /** A member was added or removed: the parent refreshes its counts. */
  @Output() changed = new EventEmitter<void>();

  readonly info = ACCESS_INFO.members;
  readonly fullName = fullName;
  readonly pageSize = 10;
  readonly skeleton = Array.from({ length: 4 }, (_, i) => ({ skeleton: true, id: -1 - i }));

  members: AccessUser[] = [];
  total = 0;
  page = 1;
  search = '';
  loading = true;
  loadError: string | null = null;

  adding = false;
  addOpen = false;
  picked: PickedUser[] = [];
  addError: string | null = null;

  removeTarget: AccessUser | null = null;
  removing = false;
  removeError: string | null = null;

  private readonly search$ = new Subject<void>();
  private readonly subs = new Subscription();
  private loadSub?: Subscription;

  constructor(
    private readonly _api: AccessAdminApiService,
    private readonly _toast: MessageService
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.search$.pipe(debounceTime(300)).subscribe(() => {
        this.page = 1;
        this.load();
      })
    );
    this.load();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.loadSub?.unsubscribe();
  }

  get rows(): unknown[] {
    return this.loading ? this.skeleton : this.members;
  }

  get first(): number {
    return (this.page - 1) * this.pageSize;
  }

  isSkeleton(row: unknown): boolean {
    return (row as { skeleton?: boolean })?.skeleton === true;
  }

  load(): void {
    this.loadSub?.unsubscribe();
    this.loading = true;
    this.loadError = null;
    this.loadSub = this._api.members(this.role.id, { search: this.search, page: this.page, pageSize: this.pageSize }).subscribe({
      next: result => {
        this.members = result.items ?? [];
        this.total = result.total ?? this.members.length;
        this.loading = false;
      },
      error: error => {
        this.members = [];
        this.total = 0;
        this.loading = false;
        this.loadError = accessErrorMessage(error, 'load the members');
      }
    });
  }

  onSearch(): void {
    this.search$.next();
  }

  onPage(event: { first: number }): void {
    const page = Math.floor((event.first || 0) / this.pageSize) + 1;
    if (page === this.page) return;
    this.page = page;
    this.load();
  }

  add(): void {
    if (this.adding || this.readOnly || !this.picked.length) return;
    const ids = this.picked.map(user => user.id);
    this.adding = true;
    this.addError = null;
    this._api.addMembers(this.role.id, ids).subscribe({
      next: result => {
        this.adding = false;
        this.picked = [];
        this.addOpen = false;
        const added = countOf(result?.added);
        const already = countOf(result?.alreadyMembers);
        this._toast.add({
          severity: 'success',
          summary: 'Members added',
          detail: `${added} ${added === 1 ? 'person' : 'people'} joined ${this.role.acronym}${already ? `; ${already} already held it` : ''}.`
        });
        this.load();
        this.changed.emit();
      },
      error: error => {
        this.adding = false;
        this.addError = accessErrorMessage(error, 'add the members');
      }
    });
  }

  askRemove(user: AccessUser): void {
    if (this.readOnly) return;
    this.removeError = null;
    this.removeTarget = user;
  }

  get removeMessage(): string {
    return this.removeTarget ? `${fullName(this.removeTarget)} will lose ${this.role.acronym} and what it opens. The change is logged with your name.` : '';
  }

  remove(justification: string): void {
    const user = this.removeTarget;
    if (this.removing || !user) return;
    this.removing = true;
    this.removeError = null;
    this._api.removeMember(this.role.id, user.id, justification).subscribe({
      next: () => {
        this.removing = false;
        this.removeTarget = null;
        this._toast.add({ severity: 'success', summary: 'Member removed', detail: `${fullName(user)} no longer holds ${this.role.acronym}.` });
        if (this.members.length === 1 && this.page > 1) this.page -= 1;
        this.load();
        this.changed.emit();
      },
      error: error => {
        this.removing = false;
        this.removeError = accessErrorMessage(error, 'remove the member');
      }
    });
  }

  closeRemove(): void {
    if (!this.removing) this.removeTarget = null;
  }
}
