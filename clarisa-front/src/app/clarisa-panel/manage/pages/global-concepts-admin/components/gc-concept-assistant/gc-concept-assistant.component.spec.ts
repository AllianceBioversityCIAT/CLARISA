import { of, Subject, throwError } from 'rxjs';
import { ConceptsAssistReply, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { assistFields } from '../../utils/concept-assist';
import { AssistHost, GcAssistSession } from './gc-assist-session.service';
import { BLINK_CLASS, GcConceptAssistantComponent, RING_CLASS } from './gc-concept-assistant.component';

describe('GcConceptAssistantComponent', () => {
  const customFields = [
    { id: 1, code: 'owner', label: 'Owner', type: 'text', list_code: null, required: false, is_public: true, sort: 0, is_active: true, help: null }
  ] as never;

  let form: Record<string, unknown>;
  let tab: string;
  let events: string[];
  let writes: { field: string; value: unknown }[];
  let host: AssistHost;
  let session: GcAssistSession;
  let api: { conceptsAssistChat: jest.Mock };
  let component: GcConceptAssistantComponent;
  let waits: number[];

  const wrapperFor = (id: string): HTMLElement => {
    const wrapper = document.createElement('div');
    wrapper.className = 'field';
    const control = document.createElement('textarea');
    control.id = id;
    wrapper.appendChild(control);
    document.body.appendChild(wrapper);
    // Record when the ring and the blink go on and off, relative to the tab switch.
    const add = wrapper.classList.add.bind(wrapper.classList);
    const remove = wrapper.classList.remove.bind(wrapper.classList);
    wrapper.classList.add = (...names: string[]) => {
      names.forEach(name => events.push(`add ${name} ${id}`));
      add(...names);
    };
    wrapper.classList.remove = (...names: string[]) => {
      names.forEach(name => events.push(`remove ${name} ${id}`));
      remove(...names);
    };
    return wrapper;
  };

  const reply = (steps: ConceptsAssistReply['steps'], text = 'Here you go.'): ConceptsAssistReply => ({ reply: text, steps, costUsd: 0.001 });

  beforeEach(() => {
    document.body.innerHTML = '';
    form = { preferred_label: 'Outcome', definition: 'Old definition', scope_note: '', term_type: null, 'x:owner': '' };
    tab = 'details';
    events = [];
    writes = [];
    waits = [];
    host = {
      currentTab: () => tab,
      setTab: next => {
        events.push(`tab ${next}`);
        tab = next;
      },
      meta: field => assistFields(customFields).find(meta => meta.field === field) ?? null,
      read: field => form[field],
      write: (field, value) => {
        writes.push({ field, value });
        form[field] = value;
      },
      baseline: field =>
        (({ preferred_label: 'Outcome', definition: 'Old definition', scope_note: '', term_type: null, 'x:owner': '' }) as Record<string, unknown>)[
          field
        ],
      display: (_field, value) => String(value ?? ''),
      draft: () => ({ ...form }),
      termId: () => 7
    };
    session = new GcAssistSession();
    session.reset();
    session.host = host;
    api = { conceptsAssistChat: jest.fn() };
    component = new GcConceptAssistantComponent(api as unknown as GlobalConceptsApiService, session);
    component.wait = (ms: number) => {
      waits.push(ms);
      return Promise.resolve();
    };
    jest.spyOn(component, 'reducedMotion').mockReturnValue(false);
  });

  /** Lets the playback (a chain of awaited promises) run to the end. */
  const settle = async () => {
    for (let i = 0; i < 200; i++) await Promise.resolve();
  };

  it('locks Send while a turn is in flight (one request for two taps) and unlocks on the answer', () => {
    const answer = new Subject<ConceptsAssistReply>();
    api.conceptsAssistChat.mockReturnValue(answer);

    component.input = 'Help me';
    component.send();
    component.input = 'Again';
    component.send();

    expect(api.conceptsAssistChat).toHaveBeenCalledTimes(1);
    expect(component.busy).toBe(true);
    expect(component.canSend).toBe(false);

    answer.next(reply([]));
    expect(component.busy).toBe(false);
  });

  it('sends on Enter and keeps Shift+Enter for a new line', () => {
    api.conceptsAssistChat.mockReturnValue(of(reply([])));
    const shift = { key: 'Enter', shiftKey: true, preventDefault: jest.fn() } as unknown as KeyboardEvent;
    component.input = 'Line one';
    component.onKeydown(shift);
    expect(api.conceptsAssistChat).not.toHaveBeenCalled();
    expect(shift.preventDefault).not.toHaveBeenCalled();

    const enter = { key: 'Enter', shiftKey: false, preventDefault: jest.fn() } as unknown as KeyboardEvent;
    component.onKeydown(enter);
    expect(enter.preventDefault).toHaveBeenCalled();
    expect(api.conceptsAssistChat).toHaveBeenCalledTimes(1);
  });

  it('sends the draft, the history and the hand edits, then clears only the edits that turn carried', () => {
    const answer = new Subject<ConceptsAssistReply>();
    api.conceptsAssistChat.mockReturnValue(answer);
    session.recordHandEdit('definition', 'Mine');
    form['definition'] = 'Mine';
    session.recordHandEdit('x:owner', 'Luis');
    form['x:owner'] = 'Luis';

    component.send('Review the whole concept');
    const [scheme, body] = api.conceptsAssistChat.mock.calls[0];
    expect(scheme).toBe('meliaf');
    expect(body.termId).toBe(7);
    expect(body.draft['definition']).toBe('Mine');
    expect(body.messages).toEqual([{ role: 'user', content: 'Review the whole concept' }]);
    expect(body.edits.map((edit: { field: string }) => edit.field)).toEqual(['definition', 'x:owner']);
    expect(body.edits[0]).toMatchObject({ seq: 1, tab: 'details', before: 'Old definition', after: 'Mine' });
    expect(component.editTrail).toBe('Definition → Owner');

    // Changed while the agent was thinking: stays for the next turn.
    session.recordHandEdit('scope_note', 'Later');
    answer.next(reply([]));

    expect(session.log.fields()).toEqual(['scope_note']);
    expect(component.editTrail).toBe('Scope note');
  });

  it('plays each step in order: tab first, then the ring and blink, the typing, and the mark', async () => {
    wrapperFor('gc-definition');
    wrapperFor('gc-x-owner');
    tab = 'fields';
    api.conceptsAssistChat.mockReturnValue(
      of(
        reply([
          { field: 'definition', tab: 'details', value: 'A change in behaviour', reason: 'Clearer' },
          { field: 'x:owner', tab: 'fields', value: 'MEL team', reason: 'Named in the source' }
        ])
      )
    );

    component.send('Help me write the definition');
    await settle();

    expect(events).toEqual([
      'tab details',
      `add ${RING_CLASS} gc-definition`,
      `add ${BLINK_CLASS} gc-definition`,
      `remove ${RING_CLASS} gc-definition`,
      `remove ${BLINK_CLASS} gc-definition`,
      'tab fields',
      `add ${RING_CLASS} gc-x-owner`,
      `add ${BLINK_CLASS} gc-x-owner`,
      `remove ${RING_CLASS} gc-x-owner`,
      `remove ${BLINK_CLASS} gc-x-owner`
    ]);
    // Typed progressively, not dropped in at once.
    const definitionWrites = writes.filter(write => write.field === 'definition').map(write => write.value);
    expect(definitionWrites.length).toBeGreaterThan(5);
    expect(definitionWrites[0]).toBe('A');
    expect(form['definition']).toBe('A change in behaviour');
    expect(waits).toContain(30);
    expect(session.markOf('definition')).toMatchObject({ state: 'suggested', previous: 'Old definition', reason: 'Clearer' });
    expect(session.markOf('x:owner')?.state).toBe('suggested');
    expect(component.playing).toBe(false);
    expect(session.messages[1].filled).toEqual(['definition', 'x:owner']);
    // The AI's typing is not a hand edit.
    expect(session.log.size).toBe(0);
  });

  it('never types over a field the person edited: the value goes to a proposal bubble', async () => {
    wrapperFor('gc-definition');
    session.recordHandEdit('definition', 'My own words');
    form['definition'] = 'My own words';
    api.conceptsAssistChat.mockReturnValue(of(reply([{ field: 'definition', tab: 'details', value: 'AI words', reason: 'You asked' }])));

    component.send('Improve it');
    await settle();

    expect(form['definition']).toBe('My own words');
    expect(writes.filter(write => write.field === 'definition')).toEqual([]);
    expect(session.markOf('definition')).toMatchObject({ state: 'proposal', value: 'AI words' });
    expect(session.messages[1].proposed).toEqual(['definition']);

    session.useProposal('definition');
    expect(form['definition']).toBe('AI words');
    expect(session.markOf('definition')).toBeNull();
    expect(session.log.fields()).toEqual(['definition']);
  });

  it('Undo puts back the value from before the suggestion; Keep clears the pill and protects the field', async () => {
    wrapperFor('gc-scope_note');
    wrapperFor('gc-definition');
    api.conceptsAssistChat.mockReturnValue(
      of(
        reply([
          { field: 'scope_note', tab: 'details', value: 'Use for results', reason: '' },
          { field: 'definition', tab: 'details', value: 'New', reason: '' }
        ])
      )
    );
    component.send('Fill it');
    await settle();

    session.undo('scope_note');
    expect(form['scope_note']).toBe('');
    expect(session.markOf('scope_note')).toBeNull();

    session.accept('definition');
    expect(form['definition']).toBe('New');
    expect(session.markOf('definition')).toBeNull();
    expect(session.isHandEdited('definition')).toBe(true);
    expect(session.isAiOwned('definition')).toBe(true);
  });

  it('with reduced motion: static ring, no blink, the value set at once', async () => {
    (component.reducedMotion as jest.Mock).mockReturnValue(true);
    wrapperFor('gc-definition');
    api.conceptsAssistChat.mockReturnValue(of(reply([{ field: 'definition', tab: 'details', value: 'Set at once', reason: '' }])));

    component.send('Go');
    await settle();

    expect(events).toEqual([`add ${RING_CLASS} gc-definition`, `remove ${RING_CLASS} gc-definition`, `remove ${BLINK_CLASS} gc-definition`]);
    expect(writes).toEqual([{ field: 'definition', value: 'Set at once' }]);
    expect(waits.filter(ms => ms > 0)).toEqual([]);
    expect(session.markOf('definition')?.state).toBe('suggested');
  });

  it('reports a step on a field this editor does not draw, without writing anything', async () => {
    api.conceptsAssistChat.mockReturnValue(of(reply([{ field: 'meliaf_phase_also', tab: 'details', value: ['plan'], reason: '' }])));
    component.send('Go');
    await settle();
    expect(writes).toEqual([]);
    expect(session.messages[1].skipped).toEqual(['meliaf_phase_also']);
  });

  it.each([
    [429, /Too many messages/],
    [503, /The monthly budget is used up/]
  ])('on %s it says why, and the message goes back into the box', (status, text) => {
    api.conceptsAssistChat.mockReturnValue(throwError(() => ({ status, error: { message: 'The monthly budget is used up.' } })));
    session.recordHandEdit('notes', 'n');

    component.send('Help me write the definition');

    expect(component.error).toMatch(text);
    expect(component.input).toBe('Help me write the definition');
    expect(session.messages).toEqual([]);
    expect(component.busy).toBe(false);
    // Not sent, so not cleared.
    expect(session.log.fields()).toEqual(['notes']);
  });

  it('drops an answer that arrives after the dialog opened another concept', () => {
    const answer = new Subject<ConceptsAssistReply>();
    api.conceptsAssistChat.mockReturnValue(answer);
    component.send('Go');
    session.reset();
    session.host = host;
    answer.next(reply([{ field: 'definition', tab: 'details', value: 'Stale', reason: '' }]));
    expect(session.messages).toEqual([]);
    expect(form['definition']).toBe('Old definition');
  });
});
