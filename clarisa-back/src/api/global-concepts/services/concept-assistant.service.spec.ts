import {
  BadGatewayException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FakeManager, fakeDataSource } from '../utils/fake-manager.spec-helper';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import { GcField, GcFieldType } from '../entities/gc-field.entity';
import { GcAiUsage } from '../entities/gc-ai-usage.entity';
import { AI_BUDGET_USED_UP, AiService, costOf } from './ai.service';
import { ConceptGraphLoader } from './concept-graph.loader';
import {
  ASSIST_AI_DOWN,
  ASSIST_DISABLED,
  ASSIST_NO_KEY,
  ASSIST_RATE_LIMITED,
  ConceptAssistantService,
} from './concept-assistant.service';

/**
 * The real AiService + assistant against the in-memory manager; only
 * OpenAI (global fetch) is mocked.
 */
describe('ConceptAssistantService', () => {
  const realFetch = global.fetch;
  const env = { ...process.env };
  let db: FakeManager;
  let service: ConceptAssistantService;

  const openAiAnswer = (content: unknown, ok = true, status = 200) =>
    jest.fn(async () => ({
      ok,
      status,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(content) } }],
        usage: { prompt_tokens: 2000, completion_tokens: 300 },
        ...(ok ? {} : { error: { message: 'boom' } }),
      }),
    })) as any;

  const dto = (over: Record<string, unknown> = {}) =>
    ({
      draft: { preferred_label: 'Theory of change' },
      messages: [{ role: 'user', content: 'Help me define Theory of change' }],
      edits: [],
      ...over,
    }) as any;

  beforeEach(() => {
    process.env.GLOBAL_CONCEPTS_AI_ENABLED = 'true';
    process.env.OPEN_AI_CLARISA_ASSISTANT_TOKEN = 'sk-test';
    process.env.GLOBAL_CONCEPTS_AI_MONTHLY_CAP_USD = '2';
    db = new FakeManager();
    const scheme = db.seed(GcScheme, {
      code: 'meliaf',
      title: 'Concepts',
      default_language: 'en',
      next_term_id: 1,
    });
    for (const [value, label] of [
      ['evaluation', 'Evaluation'],
      ['monitoring', 'Monitoring'],
    ])
      db.seed(GcListValue, {
        scope: '',
        list_code: 'meliaf_function',
        value,
        label,
        sort: 0,
        is_active: true,
      });
    db.seed(GcListValue, {
      scope: '',
      list_code: 'meliaf_function',
      value: 'retired',
      label: 'Retired',
      sort: 0,
      is_active: false,
    });
    db.seed(GcField, {
      scheme_id: scheme.id,
      code: 'owner',
      label: 'Owner team',
      type: GcFieldType.TEXT,
      is_active: true,
      sort: 0,
    });
    const ds = fakeDataSource(db);
    service = new ConceptAssistantService(
      ds,
      new AiService(ds),
      new ConceptGraphLoader(),
    );
  });
  afterEach(() => {
    global.fetch = realFetch;
    process.env = { ...env };
  });

  it('status: enabled with the remaining budget', async () => {
    db.seed(GcAiUsage, {
      month: new Date().toISOString().slice(0, 7),
      cost_usd: '0.5',
      calls: 3,
    });
    await expect(service.status()).resolves.toEqual({
      enabled: true,
      remainingUsd: 1.5,
    });
  });

  it.each([
    ['switched off', { GLOBAL_CONCEPTS_AI_ENABLED: 'false' }, ASSIST_DISABLED],
    ['without a key', { OPEN_AI_CLARISA_ASSISTANT_TOKEN: '' }, ASSIST_NO_KEY],
  ])(
    '%s: status says why and chat is a 503 that never calls OpenAI',
    async (_, vars, message) => {
      Object.assign(process.env, vars);
      global.fetch = jest.fn() as any;
      await expect(service.status()).resolves.toEqual({
        enabled: false,
        reason: message,
        remainingUsd: 2,
      });
      const err = await service.chat('meliaf', dto(), 'u1').catch((e) => e);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.message).toBe(message);
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it('cap reached: status disabled, chat 503 with the budget message, no OpenAI call', async () => {
    db.seed(GcAiUsage, {
      month: new Date().toISOString().slice(0, 7),
      cost_usd: '2.000001',
      calls: 40,
    });
    global.fetch = jest.fn() as any;
    await expect(service.status()).resolves.toEqual({
      enabled: false,
      reason: AI_BUDGET_USED_UP,
      remainingUsd: 0,
    });
    const err = await service.chat('meliaf', dto(), 'u1').catch((e) => e);
    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect(err.message).toBe(AI_BUDGET_USED_UP);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('OpenAI error or network failure → 502 with a human message', async () => {
    global.fetch = openAiAnswer({}, false, 500);
    let err = await service.chat('meliaf', dto(), 'u1').catch((e) => e);
    expect(err).toBeInstanceOf(BadGatewayException);
    expect(err.message).toBe(ASSIST_AI_DOWN);
    global.fetch = jest.fn(async () => {
      throw new Error('ECONNRESET');
    }) as any;
    err = await service.chat('meliaf', dto(), 'u1').catch((e) => e);
    expect(err).toBeInstanceOf(BadGatewayException);
    expect(err.message).toBe(ASSIST_AI_DOWN);
  });

  it('sends lists, custom fields and the conversation; sanitizes the answer; returns the cost', async () => {
    global.fetch = openAiAnswer({
      reply: 'Here is a definition.',
      steps: [
        {
          field: 'definition',
          value: 'A description of how change is expected to happen.',
          reason: 'Genus + purpose.',
          overrides_manual_edit: false,
        },
        {
          field: 'meliaf_function',
          value: ['evaluation', 'retired', 'invented'],
          reason: 'Used in evaluations.',
          overrides_manual_edit: false,
        },
        {
          field: 'preferred_label',
          value: 'ToC',
          reason: 'Shorter.',
          overrides_manual_edit: false,
        },
        { field: 'status', value: 'approved', reason: 'x' },
      ],
    });
    const out = await service.chat(
      'meliaf',
      dto({
        edits: [
          {
            seq: 1,
            field: 'preferred_label',
            tab: 'details',
            before: '',
            after: 'Theory of change',
            at: '2026-09-30T10:00:00Z',
          },
        ],
        messages: [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'Hello' },
          { role: 'user', content: 'Help me define Theory of change' },
        ],
      }),
      'u1',
    );
    expect(out).toEqual({
      reply: 'Here is a definition.',
      steps: [
        {
          field: 'definition',
          tab: 'details',
          value: 'A description of how change is expected to happen.',
          reason: 'Genus + purpose.',
        },
        {
          field: 'meliaf_function',
          tab: 'details',
          value: ['evaluation'],
          reason: 'Used in evaluations.',
        },
      ],
      costUsd: Number(costOf('gpt-5-mini', 2000, 300).toFixed(6)),
    });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages.map((m: any) => m.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user',
    ]);
    expect(body.messages[0].content).toContain('evaluation=Evaluation');
    expect(body.messages[0].content).not.toContain('retired=Retired');
    expect(body.messages[0].content).toContain('- x:owner — ');
    expect(body.response_format.json_schema.strict).toBe(true);
    // The spend is recorded; the conversation is not stored anywhere.
    expect(db.queries).toHaveLength(1);
    expect(db.queries[0].sql).toContain('gc_ai_usage');
    expect(JSON.stringify(db.queries[0].params)).not.toContain('Theory');
  });

  it('refuses a conversation that does not end with the person', async () => {
    global.fetch = jest.fn() as any;
    await expect(
      service.chat(
        'meliaf',
        dto({ messages: [{ role: 'assistant', content: 'x' }] }),
        'u1',
      ),
    ).rejects.toThrow(/end with/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('unknown scheme is a 404', async () => {
    await expect(service.chat('nope', dto(), 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rate limit: the 21st turn in 10 minutes is a 429 and never reaches OpenAI', async () => {
    global.fetch = openAiAnswer({ reply: 'ok', steps: [] });
    for (let i = 0; i < 20; i++) await service.chat('meliaf', dto(), 'u1');
    const err = await service.chat('meliaf', dto(), 'u1').catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
    expect(err.message).toBe(ASSIST_RATE_LIMITED);
    expect(global.fetch).toHaveBeenCalledTimes(20);
    // Another person is not affected.
    await expect(service.chat('meliaf', dto(), 'u2')).resolves.toMatchObject({
      reply: 'ok',
    });
  });
});
