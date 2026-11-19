import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ListDetail } from '../../models/control-lists.models';

export type PathStepId = 'fields' | 'publish' | 'records';
export type PathStepState = 'done' | 'current' | 'next';

export interface PathStep {
  id: PathStepId;
  label: string;
  state: PathStepState;
}

export interface PathView {
  steps: PathStep[];
  current: PathStepId;
  text: string;
  /** The one action of the current step; none when the action is already on the tab below. */
  action: '' | 'Publish list' | 'Go to Records';
  blocked: boolean;
}

/** What is done, what comes next and why, for a list that is not in use yet. `null` once it has records. */
export function buildPath(list: Pick<ListDetail, 'status' | 'rows' | 'fields' | 'pending_changes'>): PathView | null {
  const hasFields = list.fields.length > 0;
  const published = list.status === 'published';
  if (published && list.rows > 0) return null;

  const current: PathStepId = !hasFields ? 'fields' : !published ? 'publish' : 'records';
  const order: PathStepId[] = ['fields', 'publish', 'records'];
  const labels: Record<PathStepId, string> = { fields: 'Add the fields', publish: 'Publish', records: 'Add records' };
  const steps = order.map(id => ({
    id,
    label: labels[id],
    state: (order.indexOf(id) < order.indexOf(current) ? 'done' : id === current ? 'current' : 'next') as PathStepState
  }));

  if (current === 'fields') {
    return { steps, current, text: 'Start with the fields: what every record of this list will hold.', action: '', blocked: false };
  }
  if (current === 'publish') {
    const blocked = list.pending_changes > 0;
    const count = `${list.fields.length} ${list.fields.length === 1 ? 'field' : 'fields'} ready.`;
    return {
      steps,
      current,
      text: blocked ? 'A change to this list is still being applied.' : `${count} Publishing creates the table and opens the public address.`,
      action: 'Publish list',
      blocked
    };
  }
  return { steps, current, text: 'The list is live at its public address. It has no records yet.', action: 'Go to Records', blocked: false };
}

/** The path of a new list: fields, publish, records. It leaves once the list has records. */
@Component({
  selector: 'app-cl-list-path',
  templateUrl: './list-path.component.html',
  styleUrls: ['./list-path.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListPathComponent {
  view: PathView | null = null;

  @Input() set list(value: ListDetail | null) {
    this.view = value ? buildPath(value) : null;
  }
  /** On the Records tab the «Go to Records» action has nowhere to go. */
  @Input() onRecords = false;

  @Output() publish = new EventEmitter<void>();
  @Output() records = new EventEmitter<void>();

  act(): void {
    if (!this.view || this.view.blocked) return;
    if (this.view.current === 'publish') this.publish.emit();
    else if (this.view.current === 'records') this.records.emit();
  }
}
