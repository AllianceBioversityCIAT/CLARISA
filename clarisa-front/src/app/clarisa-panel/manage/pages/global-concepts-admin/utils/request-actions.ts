import { RequestAction, RequestState } from '../../../../../shared/services/global-concepts/global-concepts-api.service';

export interface RequestActionOption {
  action: RequestAction;
  label: string;
  /** Button style: the one decision that publishes is the only primary. */
  tone: 'brand' | 'ghost' | 'caution';
  /** A note the requester reads; mandatory where they need to know why. */
  noteRequired: boolean;
}

const OPTIONS: Record<RequestAction, RequestActionOption> = {
  start_review: { action: 'start_review', label: 'Start review', tone: 'brand', noteRequired: false },
  request_changes: { action: 'request_changes', label: 'Request changes', tone: 'ghost', noteRequired: true },
  send_to_validation: { action: 'send_to_validation', label: 'Send to validation', tone: 'ghost', noteRequired: false },
  approve: { action: 'approve', label: 'Approve', tone: 'brand', noteRequired: false },
  reject: { action: 'reject', label: 'Reject', tone: 'caution', noteRequired: true }
};

/**
 * Actions an admin can take on a request in `state`, mirroring
 * `RequestsService.nextState` in the back. `changes_requested` waits on the
 * requester, so the only admin move there is to reject; approved and rejected
 * are final. Whether the scheme has a validation step is only known to the
 * back: when it does not, `send_to_validation` answers 400 and the message is
 * shown as is.
 */
export function allowedActions(state: RequestState): RequestActionOption[] {
  switch (state) {
    case 'submitted':
      return [OPTIONS.start_review, OPTIONS.reject];
    case 'in_review':
      return [OPTIONS.approve, OPTIONS.request_changes, OPTIONS.send_to_validation, OPTIONS.reject];
    case 'validation':
      return [OPTIONS.approve, OPTIONS.request_changes, OPTIONS.reject];
    case 'changes_requested':
      return [OPTIONS.reject];
    default:
      return [];
  }
}

export function isFinalState(state: RequestState): boolean {
  return state === 'approved' || state === 'rejected';
}

export const REQUEST_STATES: RequestState[] = ['submitted', 'in_review', 'changes_requested', 'validation', 'approved', 'rejected'];

export function stateLabel(state: RequestState | string | null | undefined): string {
  switch (state) {
    case 'submitted':
      return 'Submitted';
    case 'in_review':
      return 'In review';
    case 'changes_requested':
      return 'Changes requested';
    case 'validation':
      return 'Validation';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return '—';
  }
}

export function stateSeverity(state: RequestState | string): string {
  switch (state) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'changes_requested':
    case 'validation':
      return 'warning';
    default:
      return 'info';
  }
}
