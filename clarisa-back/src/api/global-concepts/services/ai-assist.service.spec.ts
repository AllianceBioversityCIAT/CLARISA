import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiAssistService } from './ai-assist.service';
import { AiService, costOf } from './ai.service';
import { ConceptsAdminService } from './concepts-admin.service';
import { ConceptGraphLoader } from './concept-graph.loader';
import { FakeManager, fakeDataSource } from '../utils/fake-manager.spec-helper';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import {
  GcProposal,
  GcProposalOrigin,
  GcProposalState,
  GcProposalType,
} from '../entities/gc-proposal.entity';
import { GcAiUsage } from '../entities/gc-ai-usage.entity';

describe('AiAssistService', () => {
  let db: FakeManager;
  let ai: { json: jest.Mock };
  let service: AiAssistService;
  let scheme: GcScheme;

  beforeEach(() => {
    db = new FakeManager();
    scheme = db.seed(GcScheme, {
      code: 'meliaf',
      title: 'MELIAF',
      default_language: 'en',
      next_term_id: 1,
      uri_base: null,
      owner_platform: null,
    });
    for (const [value, label] of [
      ['monitoring', 'Monitoring'],
      ['evaluation', 'Evaluation'],
    ])
      db.seed(GcListValue, {
        scope: '',
        list_code: 'meliaf_function',
        value,
        label,
        sort: 0,
        is_active: true,
      });
    ai = { json: jest.fn() };
    const ds = fakeDataSource(db);
    service = new AiAssistService(
      ds,
      ai as unknown as AiService,
      new ConceptsAdminService(ds, new ConceptGraphLoader()),
    );
  });

  it('resolves exact headers without AI and keeps one column per field', async () => {
    ai.json.mockResolvedValue({
      matches: [
        { column: 1, field: 'definition', confidence: 0.9 },
        { column: 2, field: 'definition', confidence: 0.4 }, // duplicate field
        { column: 3, field: 'made_up', confidence: 0.99 }, // unknown field
      ],
    });
    const r = await service.mapColumns(
      ['Preferred label', 'What it means', 'Meaning 2', 'Other'],
      [['Outcome', 'A change', 'x', 'y']],
    );
    expect(r.columns[0]).toMatchObject({
      field: 'preferred_label',
      source: 'exact',
      confidence: 1,
    });
    expect(r.columns[1]).toMatchObject({ field: 'definition', source: 'ai' });
    expect(r.columns[2].field).toBeNull();
    expect(r.columns[3].field).toBeNull();
    const sent = ai.json.mock.calls[0][2];
    expect(sent.columns.map((c: any) => c.column)).toEqual([1, 2, 3]);
    expect(sent.fields.some((f: any) => f.field === 'preferred_label')).toBe(
      false,
    );
  });

  it('maps two exact headers of the same field only once', async () => {
    ai.json.mockResolvedValue({ matches: [] });
    const r = await service.mapColumns(['TERM ID', 'term_id', 'Definition']);
    expect(r.columns.map((c) => c.field)).toEqual([
      'term_id',
      null,
      'definition',
    ]);
  });

  it('answers 404 for a missing request and 409 for a decided one', async () => {
    await expect(service.recommend(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    const p = db.seed(GcProposal, {
      type: GcProposalType.NEW,
      scheme_id: scheme.id,
      payload: { preferred_label: 'X' },
      state: GcProposalState.APPROVED,
      ai_recommendation: { verdict: 'approve' },
    });
    await expect(service.recommend(p.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(db.rows(GcProposal)[0].ai_recommendation).toEqual({
      verdict: 'approve',
    });
    expect(ai.json).not.toHaveBeenCalled();
  });

  it('does not call the model when every header is exact', async () => {
    await service.mapColumns(['term_id', 'definition']);
    expect(ai.json).not.toHaveBeenCalled();
  });

  it('normalizes list values, exact first, and drops invented values', async () => {
    ai.json.mockResolvedValue({
      values: [
        { input: 'monitorng', value: 'monitoring' },
        { input: 'Learning stuff', value: 'learning' },
      ],
    });
    const r = await service.normalizeValues('meliaf', 'meliaf_function', [
      'Evaluation',
      'monitorng',
      'Learning stuff',
    ]);
    expect(r.values).toEqual([
      { input: 'Evaluation', value: 'evaluation', source: 'exact' },
      { input: 'monitorng', value: 'monitoring', source: 'ai' },
      { input: 'Learning stuff', value: null, source: 'ai' },
    ]);
  });

  it('stores an advisory recommendation without moving the request or leaking the email', async () => {
    db.seed(GcConcept, {
      scheme_id: scheme.id,
      term_id: 1,
      preferred_label: 'Outcome',
      language: 'en',
      status: GcConceptStatus.APPROVED,
      definition: 'A change',
    });
    const p = db.seed(GcProposal, {
      type: GcProposalType.NEW,
      scheme_id: scheme.id,
      concept_id: null,
      target_scheme_id: null,
      payload: {
        preferred_label: 'Outcomes',
        definition: 'Outcomes are outcomes',
        meliaf_function: ['Foresighting'],
      },
      rationale: 'needed',
      requester_email: 'person@cgiar.org',
      origin: GcProposalOrigin.FORM,
      state: GcProposalState.IN_REVIEW,
    });
    ai.json.mockResolvedValue({
      verdict: 'needs_changes',
      summary: 'Near duplicate of Outcome',
      reasons: [
        { kind: 'duplicate', severity: 'blocking', message: 'See term 1' },
      ],
      suggested_changes: 'Use Outcome',
    });
    const rec = await service.recommend(p.id);
    const stored = db.rows(GcProposal)[0];
    expect(stored.state).toBe(GcProposalState.IN_REVIEW);
    expect(stored.ai_recommendation).toEqual(rec);
    expect(rec.advisory).toBe(true);
    expect(rec.similar.map((s) => s.term_id)).toEqual([1]);
    const checks = Object.fromEntries(rec.checks.map((c) => [c.check, c.ok]));
    expect(checks).toMatchObject({
      definition_present: true,
      definition_not_circular: false,
      source_present: false,
      list_values_valid: false,
    });
    expect(JSON.stringify(ai.json.mock.calls[0][2])).not.toContain(
      'person@cgiar.org',
    );
  });
});

describe('AiService', () => {
  const realFetch = global.fetch;
  const env = { ...process.env };
  afterEach(() => {
    global.fetch = realFetch;
    process.env = { ...env };
  });

  const make = (month: Partial<GcAiUsage> | null) => {
    const query = jest.fn(async () => undefined);
    const ds = {
      manager: { findOne: jest.fn(async () => month) },
      query,
    } as any;
    return { svc: new AiService(ds), query };
  };

  it('prices unknown models high so the cap stays conservative', () => {
    expect(costOf('gpt-5-mini', 1_000_000, 0)).toBeCloseTo(0.25);
    expect(costOf('some-new-model', 1_000_000, 0)).toBeCloseTo(5);
  });

  it('refuses once the monthly cap is spent, without calling OpenAI', async () => {
    process.env.GLOBAL_CONCEPTS_AI_MONTHLY_CAP_USD = '2';
    global.fetch = jest.fn() as any;
    const { svc } = make({ month: 'x', cost_usd: '2.0000', calls: 9 });
    await expect(svc.json('t', 's', {}, {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('parses the structured answer and records the spend', async () => {
    process.env.OPEN_AI_CLARISA_ASSISTANT_TOKEN = 'sk-test';
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '{"a":1}' } }],
        usage: { prompt_tokens: 1000, completion_tokens: 100 },
      }),
    })) as any;
    const { svc, query } = make(null);
    await expect(svc.json('t', 's', { x: 1 }, {})).resolves.toEqual({ a: 1 });
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-test');
    expect(query).toHaveBeenCalledTimes(1);
    expect((query.mock.calls[0] as any[])[1][3]).toBe(
      costOf('gpt-5-mini', 1000, 100).toFixed(6),
    );
  });
});
