import { AssistEditLog, assistErrorMessage, assistFields, coerceValue, CORE_ASSIST_FIELDS, historyForTurn, typingPlan } from './concept-assist';

describe('concept assistant utils', () => {
  describe('AssistEditLog', () => {
    it('keeps the order of the fields the person touched and folds keystrokes of one field', () => {
      const log = new AssistEditLog();
      log.record('definition', 'details', '', 'A', '2026-09-30T10:00:00Z');
      log.record('definition', 'details', 'A', 'A change', '2026-09-30T10:00:01Z');
      log.record('scope_note', 'details', '', 'Use for…', '2026-09-30T10:00:02Z');
      log.record('term_type', 'details', null, 'concept', '2026-09-30T10:00:03Z');

      expect(log.pending()).toEqual([
        { seq: 1, field: 'definition', tab: 'details', before: '', after: 'A change', at: '2026-09-30T10:00:01Z' },
        { seq: 2, field: 'scope_note', tab: 'details', before: '', after: 'Use for…', at: '2026-09-30T10:00:02Z' },
        { seq: 3, field: 'term_type', tab: 'details', before: null, after: 'concept', at: '2026-09-30T10:00:03Z' }
      ]);
    });

    it('drops an entry the person brought back to where it started', () => {
      const log = new AssistEditLog();
      log.record('steward', 'details', 'Ana', 'Anab');
      log.record('steward', 'details', 'Anab', 'Ana');
      expect(log.size).toBe(0);
    });

    it('clears only what a turn carried; later edits stay pending', () => {
      const log = new AssistEditLog();
      log.record('definition', 'details', '', 'x');
      log.record('x:owner', 'fields', '', 'Luis');
      log.clearUpTo(1);
      expect(log.fields()).toEqual(['x:owner']);
    });

    it('sends at most the last 50 edits', () => {
      const log = new AssistEditLog();
      for (let i = 0; i < 60; i++) log.record(i % 2 ? 'definition' : 'notes', 'details', `${i}`, `${i + 1}`);
      const pending = log.pending();
      expect(pending).toHaveLength(50);
      expect(pending[49].seq).toBe(60);
    });
  });

  it('types any text within 1.2 s at 30 ms a tick, ending on the full length', () => {
    expect(typingPlan(5)).toEqual([1, 2, 3, 4, 5]);
    const long = typingPlan(1000);
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long[long.length - 1]).toBe(1000);
    expect(typingPlan(0)).toEqual([0]);
  });

  it('caps the history at 20 messages of 4000 characters', () => {
    const messages = Array.from({ length: 25 }, (_, i) => ({ role: 'user' as const, content: `${i}`.padEnd(5000, 'x') }));
    const sent = historyForTurn(messages);
    expect(sent).toHaveLength(20);
    expect(sent[0].content.startsWith('5')).toBe(true);
    expect(sent[0].content).toHaveLength(4000);
  });

  it('says in plain words what a 429, a 502 and a 503 mean', () => {
    expect(assistErrorMessage({ status: 429 })).toMatch(/Too many messages/);
    expect(assistErrorMessage({ status: 502 })).toMatch(/Nothing in the form changed/);
    expect(assistErrorMessage({ status: 503, error: { message: 'The monthly AI budget is used up.' } })).toBe('The monthly AI budget is used up.');
    expect(assistErrorMessage({ status: 503 })).toMatch(/not available right now/);
  });

  it('coerces a step value to what its control binds', () => {
    const [functionMeta] = CORE_ASSIST_FIELDS.filter(meta => meta.field === 'functions');
    const [typeMeta] = CORE_ASSIST_FIELDS.filter(meta => meta.field === 'term_type');
    expect(coerceValue(functionMeta, 'monitoring')).toEqual(['monitoring']);
    expect(coerceValue(typeMeta, '')).toBeNull();
    const fields = assistFields([
      {
        id: 1,
        code: 'links',
        label: 'Links',
        type: 'term_link',
        list_code: null,
        required: false,
        is_public: true,
        sort: 0,
        is_active: true,
        help: null
      },
      { id: 2, code: 'gone', label: 'Gone', type: 'text', list_code: null, required: false, is_public: true, sort: 1, is_active: false, help: null }
    ] as never);
    const links = fields.find(meta => meta.field === 'x:links')!;
    expect(fields.some(meta => meta.field === 'x:gone')).toBe(false);
    expect(links.tab).toBe('fields');
    expect(coerceValue(links, ['12', 'bad', 3])).toEqual([12, 3]);
  });
});
