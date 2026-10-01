import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import {
  AiRecommendation,
  ConceptRequest,
  GlobalConceptsApiService
} from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { GcRequestsPanelComponent, payloadValue, requestConceptLabel } from './gc-requests-panel.component';

describe('GcRequestsPanelComponent', () => {
  const request = (id: number, state: ConceptRequest['state'], extra: Partial<ConceptRequest> = {}): ConceptRequest =>
    ({
      id,
      type: 'new',
      state,
      payload: { preferred_label: `Concept ${id}`, functions: ['monitoring', 'learning'] },
      rationale: 'Needed',
      decision_note: null,
      no_objection_until: null,
      created_at: '2026-09-20T10:00:00Z',
      updated_at: '2026-09-20T10:00:00Z',
      requester_email: 'someone@cgiar.org',
      origin: 'form',
      ...extra
    }) as ConceptRequest;

  const recommendation: AiRecommendation = {
    advisory: true,
    verdict: 'needs_changes',
    summary: 'Close to an existing concept.',
    reasons: [{ kind: 'duplicate', severity: 'warning', message: 'Similar to 12' }],
    suggested_changes: '',
    checks: [{ check: 'has_definition', ok: true, detail: '' }],
    similar: [{ term_id: 12, preferred_label: 'Outcome' }],
    generated_at: '2026-09-21T10:00:00Z'
  };

  let api: Record<string, jest.Mock>;
  let messages: { add: jest.Mock };
  let component: GcRequestsPanelComponent;
  const all = [request(1, 'submitted'), request(2, 'in_review'), request(3, 'approved'), request(4, 'validation')];

  beforeEach(() => {
    api = {
      scheme: jest.fn(() => of({ code: 'concepts', validator_required: false })),
      requests: jest.fn(() => of(all)),
      request: jest.fn((id: number) => of(all.find(r => r.id === id))),
      transition: jest.fn(() => of(request(2, 'approved'))),
      aiRecommendation: jest.fn(() => of(recommendation))
    };
    messages = { add: jest.fn() };
    component = new GcRequestsPanelComponent(api as unknown as GlobalConceptsApiService, messages as unknown as MessageService);
    component.ngOnInit();
  });

  it('opens on the open requests and counts every state', () => {
    expect(component.rows.map(row => row.id)).toEqual([1, 2, 4]);
    expect(component.counts['open']).toBe(3);
    expect(component.counts['approved']).toBe(1);
    expect(component.counts['all']).toBe(4);

    component.setFilter('approved');
    expect(component.rows.map(row => row.id)).toEqual([3]);
  });

  it('stops loading and keeps the message when the list fails', () => {
    api['requests'].mockReturnValueOnce(throwError(() => ({ error: { message: 'Forbidden resource' } })));
    component.load();

    expect(component.loading).toBe(false);
    expect(component.loadError).toBe('Forbidden resource');
  });

  it('sends the state it shows as expected_state, with the note', () => {
    component.open(all[1]);
    component.chooseAction(component.actions.find(a => a.action === 'approve')!);
    component.note = '  looks right ';
    component.confirmAction();

    expect(api['transition']).toHaveBeenCalledWith(2, { action: 'approve', expected_state: 'in_review', note: 'looks right' });
    expect(component.pendingAction).toBeNull();
  });

  it('does not send a rejection without a note', () => {
    component.open(all[1]);
    component.chooseAction(component.actions.find(a => a.action === 'reject')!);

    expect(component.noteMissing).toBe(true);
    component.confirmAction();
    expect(api['transition']).not.toHaveBeenCalled();
  });

  it('on 409 shows the back message and reloads list and detail', () => {
    api['transition'].mockReturnValueOnce(
      throwError(() => ({ status: 409, error: { message: 'The request is approved, not in_review; reload it' } }))
    );
    component.open(all[1]);
    api['requests'].mockClear();
    api['request'].mockClear();

    component.chooseAction(component.actions[0]);
    component.confirmAction();

    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn', detail: 'The request is approved, not in_review; reload it' })
    );
    expect(api['requests']).toHaveBeenCalled();
    expect(api['request']).toHaveBeenCalledWith(2);
    expect(component.transitioning).toBe(false);
  });

  it('hides the AI button when AI is disabled, and on closed requests', () => {
    component.open(all[1]);
    expect(component.showAiButton).toBe(false);

    component.aiEnabled = true;
    expect(component.showAiButton).toBe(true);

    component.open(all[2]);
    expect(component.showAiButton).toBe(false);
  });

  it('shows a stored recommendation without calling the AI again', () => {
    const stored = request(5, 'in_review', { ai_recommendation: recommendation });
    api['request'].mockReturnValueOnce(of(stored));
    component.aiEnabled = true;
    component.open(stored);

    expect(component.recommendation).toBe(recommendation);
    expect(api['aiRecommendation']).not.toHaveBeenCalled();
  });

  it('asks the AI on demand and keeps the answer on the request', () => {
    component.aiEnabled = true;
    component.open(all[1]);
    component.askAi();

    expect(api['aiRecommendation']).toHaveBeenCalledWith(2);
    expect(component.recommendation?.verdict).toBe('needs_changes');
    expect(component.aiLoading).toBe(false);
  });

  it('reads payload values and the concept label', () => {
    expect(payloadValue(['a', 'b'])).toBe('a, b');
    expect(payloadValue(null)).toBe('—');
    expect(payloadValue({ label: 'Outcome' })).toBe('Outcome');
    expect(requestConceptLabel(request(9, 'submitted', { concept: { term_id: 3, preferred_label: 'Stored' } }))).toBe('Stored');
    expect(requestConceptLabel(request(9, 'submitted'))).toBe('Concept 9');
  });

  it('does not offer "Send to validation" when the scheme has no validation step', () => {
    expect(component.hasValidation).toBe(false);
  });
});
