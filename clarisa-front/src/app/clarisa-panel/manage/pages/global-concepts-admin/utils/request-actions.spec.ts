import { allowedActions, isFinalState, stateLabel } from './request-actions';

describe('Global Concepts requests — actions per state', () => {
  const actionsOf = (state: Parameters<typeof allowedActions>[0]) => allowedActions(state).map(option => option.action);

  it('submitted: start the review (or reject)', () => {
    expect(actionsOf('submitted')).toEqual(['start_review', 'reject']);
  });

  it('in review: approve, request changes, send to validation, reject', () => {
    expect(actionsOf('in_review')).toEqual(['approve', 'request_changes', 'send_to_validation', 'reject']);
  });

  it('validation: approve or reject, and request changes as the back allows', () => {
    expect(actionsOf('validation')).toEqual(['approve', 'request_changes', 'reject']);
  });

  it('changes requested waits on the requester; approved and rejected are final', () => {
    expect(actionsOf('changes_requested')).toEqual(['reject']);
    expect(actionsOf('approved')).toEqual([]);
    expect(actionsOf('rejected')).toEqual([]);
    expect(isFinalState('approved')).toBe(true);
    expect(isFinalState('in_review')).toBe(false);
  });

  it('requires a note to request changes and to reject, never to approve', () => {
    const inReview = allowedActions('in_review');

    expect(inReview.find(o => o.action === 'request_changes')?.noteRequired).toBe(true);
    expect(inReview.find(o => o.action === 'reject')?.noteRequired).toBe(true);
    expect(inReview.find(o => o.action === 'approve')?.noteRequired).toBe(false);
  });

  it('names the states for people', () => {
    expect(stateLabel('changes_requested')).toBe('Changes requested');
    expect(stateLabel(null)).toBe('—');
  });
});
