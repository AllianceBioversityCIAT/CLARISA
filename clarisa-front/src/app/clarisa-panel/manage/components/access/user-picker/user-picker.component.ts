import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccessAdminApiService, AccessUser } from '../../../../../shared/services/access-admin/access-admin-api.service';
import { fullName } from '../../../../../shared/services/access-admin/access-rules';

export interface PickedUser extends AccessUser {
  display: string;
}

/**
 * Multi-select search of CLARISA users (`GET api/access-admin/users?search=`).
 * Asks the server as the person types — the list has thousands of people, so
 * it is never loaded whole.
 */
@Component({
  selector: 'app-access-user-picker',
  templateUrl: './user-picker.component.html'
})
export class UserPickerComponent implements OnDestroy {
  @Input() inputId = 'acc-user-picker';
  /** People to leave out of the suggestions (e.g. members already in the role). */
  @Input() excludeIds: number[] = [];
  @Input() disabled = false;
  @Input() selected: PickedUser[] = [];
  @Output() selectedChange = new EventEmitter<PickedUser[]>();

  suggestions: PickedUser[] = [];
  error: string | null = null;
  private pending?: Subscription;

  constructor(private readonly _api: AccessAdminApiService) {}

  search(query: string): void {
    this.pending?.unsubscribe();
    this.error = null;
    this.pending = this._api.users({ search: query, page: 1, pageSize: 10 }).subscribe({
      next: page => {
        const skip = new Set([...this.excludeIds, ...this.selected.map(user => user.id)]);
        this.suggestions = page.items.filter(user => !skip.has(user.id)).map(user => ({ ...user, display: fullName(user) }));
      },
      error: () => {
        this.suggestions = [];
        this.error = 'The people search failed. Type again to retry.';
      }
    });
  }

  onChange(value: PickedUser[]): void {
    this.selected = value ?? [];
    this.selectedChange.emit(this.selected);
  }

  ngOnDestroy(): void {
    this.pending?.unsubscribe();
  }
}
