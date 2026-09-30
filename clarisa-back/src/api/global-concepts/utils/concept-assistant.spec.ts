import { GcField, GcFieldType } from '../entities/gc-field.entity';
import {
  ASSIST_FIELDS,
  AssistContext,
  AssistRateLimiter,
  assistantAnswerSchema,
  buildAssistantPrompt,
  messageNamesField,
  sanitizeAnswer,
} from './concept-assistant';

const field = (data: Partial<GcField>): GcField =>
  Object.assign(new GcField(), {
    scheme_id: 1,
    required: false,
    is_public: true,
    is_active: true,
    sort: 0,
    list_code: null,
    help: null,
    ...data,
  });

const ctx = (): AssistContext => ({
  scheme: { code: 'meliaf', title: 'Concepts', description: null },
  lists: new Map([
    [
      'meliaf_function',
      [
        { value: 'monitoring', label: 'Monitoring' },
        { value: 'evaluation', label: 'Evaluation' },
      ],
    ],
    ['meliaf_phase', [{ value: 'design', label: 'Design' }]],
    ['term_type', [{ value: 'concept', label: 'Concept' }]],
    ['derivation', []],
    ['funding', [{ value: 'bilateral', label: 'Bilateral funding' }]],
  ]),
  customFields: [
    field({
      code: 'owner',
      label: 'Owner team',
      type: GcFieldType.TEXT,
      sort: 2,
    }),
    field({
      code: 'funding',
      label: 'Funding source',
      type: GcFieldType.LIST,
      list_code: 'funding',
      sort: 1,
      help: 'Who pays for the work this term describes.',
    }),
    field({
      code: 'links',
      label: 'Linked terms',
      type: GcFieldType.TERM_LINK,
    }),
    field({
      code: 'old',
      label: 'Old field',
      type: GcFieldType.TEXT,
      is_active: false,
    }),
  ],
});

describe('buildAssistantPrompt', () => {
  const edits = [
    {
      seq: 3,
      field: 'definition',
      tab: 'details',
      before: 'a',
      after: 'b',
      at: '2026-09-30T10:03:00Z',
    },
    {
      seq: 1,
      field: 'preferred_label',
      tab: 'details',
      before: '',
      after: 'ToC',
      at: '2026-09-30T10:01:00Z',
    },
    {
      seq: 2,
      field: 'x:owner',
      tab: 'fields',
      before: null,
      after: 'MEL CoP',
      at: '2026-09-30T10:02:00Z',
    },
  ];
  const prompt = buildAssistantPrompt(ctx(), {
    draft: {
      preferred_label: 'Theory of change',
      notes: 'ask person@cgiar.org',
      secret_column: 'never sent',
      extra: { funding: 'bilateral' },
    },
    edits,
    termId: 42,
  });

  it('explains MELIAF and the proposal-only rule', () => {
    expect(prompt).toContain(
      'Monitoring, Evaluation, Learning, Impact Assessment and Foresight',
    );
    expect(prompt).toMatch(/NEVER change a field that appears in MANUAL EDITS/);
    expect(prompt).toMatch(/language the person writes in/);
    expect(prompt).toContain('term id 42');
  });

  it('lists every whitelisted field with its meaning', () => {
    for (const f of ASSIST_FIELDS) {
      expect(prompt).toContain(`- ${f.field} — `);
      expect(prompt).toContain(f.meaning);
    }
  });

  it('includes the active list codes with labels, and marks empty lists', () => {
    expect(prompt).toContain(
      'codes: monitoring=Monitoring; evaluation=Evaluation',
    );
    expect(prompt).toContain('codes: design=Design');
    expect(prompt).toMatch(
      /derivation[^\n]*\n\s+codes: \(this list has no active values/,
    );
  });

  it('includes active custom fields as x:<code>, in sort order, without term links or inactive ones', () => {
    expect(prompt).toContain(
      '- x:funding — one code of list "funding" — Funding source: Who pays',
    );
    expect(prompt).toContain('codes: bilateral=Bilateral funding');
    expect(prompt).toContain('- x:owner — text, max 1000 chars — Owner team');
    expect(prompt.indexOf('x:funding')).toBeLessThan(
      prompt.indexOf('- x:owner'),
    );
    expect(prompt).not.toContain('x:links');
    expect(prompt).not.toContain('x:old');
  });

  it('sends only whitelisted draft keys, reads custom values from extra, masks e-mails', () => {
    expect(prompt).toContain('"preferred_label":"Theory of change"');
    expect(prompt).toContain('"x:funding":"bilateral"');
    expect(prompt).toContain('"notes":"ask [email]"');
    expect(prompt).not.toContain('person@cgiar.org');
    expect(prompt).not.toContain('never sent');
  });

  it('includes the manual edits ordered by seq', () => {
    const block = prompt.slice(prompt.indexOf('MANUAL EDITS'));
    const a = block.indexOf('"seq":1');
    const b = block.indexOf('"seq":2');
    const c = block.indexOf('"seq":3');
    expect(a).toBeGreaterThan(-1);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(block).toContain('"field":"x:owner"');
  });

  it('says (none) when there are no edits', () => {
    expect(buildAssistantPrompt(ctx(), { draft: {} })).toContain(
      'MANUAL EDITS (in the order the person made them)\n(none)',
    );
  });

  it('builds a strict schema whose field enum is the whitelist', () => {
    const schema = assistantAnswerSchema(ctx()) as any;
    const fields = schema.properties.steps.items.properties.field.enum;
    expect(fields).toEqual([
      ...ASSIST_FIELDS.map((f) => f.field),
      'x:funding',
      'x:owner',
    ]);
  });
});

describe('sanitizeAnswer', () => {
  const run = (steps: any[], edits: any[] = [], lastUserMessage = 'help me') =>
    sanitizeAnswer(ctx(), { reply: ' Hi ', steps }, { edits, lastUserMessage });

  it('drops unknown fields and keeps the tab of each field', () => {
    const out = run([
      { field: 'definition', value: 'A description.', reason: 'r' },
      { field: 'status', value: 'approved', reason: 'r' },
      { field: 'x:nope', value: 'x', reason: 'r' },
      { field: 'x:links', value: ['5'], reason: 'r' },
      { field: 'x:owner', value: 'MEL CoP', reason: 'r' },
    ]);
    expect(out.reply).toBe('Hi');
    expect(out.steps).toEqual([
      {
        field: 'definition',
        tab: 'details',
        value: 'A description.',
        reason: 'r',
      },
      { field: 'x:owner', tab: 'fields', value: 'MEL CoP', reason: 'r' },
    ]);
  });

  it('keeps only valid list codes (label → code), never invents one', () => {
    const out = run([
      {
        field: 'meliaf_function',
        value: ['Evaluation', 'monitoring', 'forecasting'],
        reason: '',
      },
      { field: 'term_type', value: 'method', reason: '' },
      { field: 'meliaf_phase_primary', value: 'DESIGN', reason: '' },
      { field: 'derivation', value: 'adopted', reason: '' },
      { field: 'x:funding', value: 'Bilateral funding', reason: '' },
      { field: 'meliaf_phase_also', value: ['nothing'], reason: '' },
    ]);
    expect(out.steps.map((s) => [s.field, s.value])).toEqual([
      ['meliaf_function', ['evaluation', 'monitoring']],
      ['meliaf_phase_primary', 'design'],
      ['x:funding', 'bilateral'],
    ]);
  });

  it('drops over-long values against the DTO limits and bad URLs', () => {
    const out = run([
      { field: 'short_definition', value: 'x'.repeat(501), reason: '' },
      { field: 'steward', value: 'y'.repeat(256), reason: '' },
      { field: 'preferred_label', value: 'z'.repeat(500), reason: '' },
      { field: 'source_url', value: 'javascript:alert(1)', reason: '' },
      { field: 'definition', value: ['not', 'a text'], reason: '' },
      { field: 'scope_note', value: '   ', reason: '' },
    ]);
    expect(out.steps.map((s) => s.field)).toEqual(['preferred_label']);
  });

  it('never returns a hand-edited field unless the latest message asks for it', () => {
    const edits = [{ seq: 1, field: 'definition', tab: 'details', at: 'x' }];
    const step = {
      field: 'definition',
      value: 'New text.',
      reason: 'Better genus.',
      overrides_manual_edit: true,
    };
    expect(run([step], edits, 'fill the rest please').steps).toEqual([]);
    // Named, but the model did not flag it as asked.
    expect(
      run(
        [{ ...step, overrides_manual_edit: false }],
        edits,
        'improve the definition',
      ).steps,
    ).toEqual([]);
    const asked = run(
      [step],
      edits,
      'Please rewrite the definition, it is too long',
    );
    expect(asked.steps).toHaveLength(1);
    expect(asked.steps[0].reason).toBe(
      'You asked to change this field you edited by hand. Better genus.',
    );
  });

  it('protects hand-edited custom fields by their label too', () => {
    const edits = [{ seq: 1, field: 'x:owner', tab: 'fields', at: 'x' }];
    const step = {
      field: 'x:owner',
      value: 'Team B',
      reason: 'You asked.',
      overrides_manual_edit: true,
    };
    expect(run([step], edits, 'change the funding').steps).toEqual([]);
    expect(
      run([step], edits, 'change the owner team to Team B').steps[0],
    ).toEqual({
      field: 'x:owner',
      tab: 'fields',
      value: 'Team B',
      reason: 'You asked.',
    });
  });

  it('keeps one step per field and at most 12', () => {
    const many: any[] = ASSIST_FIELDS.filter((f) => f.kind === 'text').flatMap(
      (f) => [
        { field: f.field, value: 'one', reason: '' },
        { field: f.field, value: 'two', reason: '' },
      ],
    );
    many.push(
      { field: 'x:owner', value: 'a', reason: '' },
      { field: 'source_url', value: 'https://example.org', reason: '' },
      { field: 'meliaf_function', value: ['evaluation'], reason: '' },
      { field: 'x:funding', value: 'bilateral', reason: '' },
      { field: 'meliaf_phase_primary', value: 'design', reason: '' },
    );
    const out = run(many);
    expect(out.steps).toHaveLength(12);
    expect(new Set(out.steps.map((s) => s.field)).size).toBe(12);
    expect(out.steps.every((s) => s.value !== 'two')).toBe(true);
  });

  it('survives a malformed answer', () => {
    expect(sanitizeAnswer(ctx(), null, { lastUserMessage: 'x' })).toEqual({
      reply: '',
      steps: [],
    });
    expect(
      sanitizeAnswer(ctx(), { reply: 5, steps: 'x' } as any, {
        lastUserMessage: 'x',
      }),
    ).toEqual({ reply: '', steps: [] });
  });

  it('matches field names on word boundaries', () => {
    const notes = ASSIST_FIELDS.find((f) => f.field === 'notes')!;
    expect(messageNamesField('update the notes', notes)).toBe(true);
    expect(messageNamesField('footnotes are fine', notes)).toBe(false);
  });
});

describe('AssistRateLimiter', () => {
  it('allows N turns per window per user, then refuses until the window slides', () => {
    const limiter = new AssistRateLimiter(3, 1000);
    expect([0, 10, 20].map((t) => limiter.take('u1', t))).toEqual([
      true,
      true,
      true,
    ]);
    expect(limiter.take('u1', 30)).toBe(false);
    expect(limiter.take('u2', 30)).toBe(true);
    expect(limiter.take('u1', 1001)).toBe(true);
  });
});
