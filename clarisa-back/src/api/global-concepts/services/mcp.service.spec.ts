import { NotFoundException } from '@nestjs/common';
import { McpService, MCP_PROTOCOL_VERSIONS } from './mcp.service';
import {
  ConceptsSuggestService,
  matchConcepts,
} from './concepts-suggest.service';
import { PublicConcept } from '../utils/concept-presenter';
import { GcLabelKind } from '../entities/gc-label.entity';

const concept = (
  term_id: number,
  preferred_label: string,
  alt: { label: string; kind: GcLabelKind }[] = [],
  extra: Partial<PublicConcept> = {},
): PublicConcept =>
  ({
    scheme: 'concepts',
    term_id,
    term_uri: `https://api.clarisa.cgiar.org/concepts/${term_id}`,
    preferred_label,
    language: 'en',
    preferred_labels: [{ label: preferred_label, language: 'en' }],
    alternative_labels: alt.map((a) => ({
      ...a,
      language: 'en',
      discouraged: false,
    })),
    definition: `Definition of ${preferred_label}`,
    short_definition: null,
    status: 'approved',
    replaced_by: null,
    ...extra,
  }) as PublicConcept;

const REGISTER = [
  concept(1, 'Impact'),
  concept(2, 'Impact assessment', [{ label: 'IA', kind: GcLabelKind.ACRONYM }]),
  concept(3, 'Outcome', [{ label: 'result', kind: GcLabelKind.ALT }]),
];

describe('matchConcepts', () => {
  it('matches whole words, prefers the longer label and counts hits', () => {
    const hits = matchConcepts(
      REGISTER,
      'An impact assessment measures impact. Outcomes differ from an outcome.',
    );
    expect(hits.map((h) => h.term_id)).toEqual([1, 2, 3]);
    expect(hits.find((h) => h.term_id === 1)!.matched[0].count).toBe(1);
    expect(hits.find((h) => h.term_id === 3)!.matched[0].count).toBe(1); // not "Outcomes"
  });

  it('matches acronyms case-sensitively only', () => {
    expect(
      matchConcepts(REGISTER, 'La IA ex ante').map((h) => h.term_id),
    ).toEqual([2]);
    expect(matchConcepts(REGISTER, 'la ia de hoy')).toEqual([]);
  });
});

describe('matchConcepts at scale and with shared labels', () => {
  it('reports every concept that shares a label', () => {
    const hits = matchConcepts(
      [
        concept(10, 'Indicator', [{ label: 'KPI', kind: GcLabelKind.ACRONYM }]),
        concept(11, 'Key performance indicator', [
          { label: 'KPI', kind: GcLabelKind.ACRONYM },
        ]),
      ],
      'Each KPI is tracked',
    );
    expect(hits.map((h) => h.term_id).sort()).toEqual([10, 11]);
  });

  it('scans a 20 000-character text against 1 500 labels quickly', () => {
    const register = Array.from({ length: 500 }, (_, i) =>
      concept(i + 1, `term number ${i}`, [
        { label: `synonym ${i} alpha`, kind: GcLabelKind.ALT },
        { label: `AC${i}`, kind: GcLabelKind.ACRONYM },
      ]),
    );
    const text = 'term number 42 and synonym 7 alpha plus AC9 '.repeat(450);
    const start = Date.now();
    const hits = matchConcepts(register, text.slice(0, 20_000));
    expect(Date.now() - start).toBeLessThan(1500);
    expect(hits.map((h) => h.term_id).sort((a, b) => a - b)).toEqual([
      8, 10, 43,
    ]);
  });
});

describe('McpService', () => {
  const read = {
    list: jest.fn(async () => REGISTER),
    get: jest.fn(async (_s: string, id: number) => {
      const c = REGISTER.find((x) => x.term_id === id);
      if (!c) throw new NotFoundException('Concept concepts/99 was not found');
      return c;
    }),
    releases: jest.fn(async () => [{ version: '1.0.0' }]),
  };
  const mcp = new McpService(
    read as any,
    new ConceptsSuggestService(read as any),
  );
  const call = (name: string, args: Record<string, unknown>) =>
    mcp.handle({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name, arguments: args },
    }) as Promise<any>;

  it('negotiates the protocol version', async () => {
    const r: any = await mcp.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18' },
    });
    expect(r.result.protocolVersion).toBe('2025-06-18');
    const r2: any = await mcp.handle({
      jsonrpc: '2.0',
      id: 2,
      method: 'initialize',
      params: { protocolVersion: '1999-01-01' },
    });
    expect(r2.result.protocolVersion).toBe(MCP_PROTOCOL_VERSIONS[0]);
    expect(r2.result.capabilities.tools).toBeDefined();
  });

  it('lists four read-only tools', async () => {
    const r: any = await mcp.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    });
    expect(r.result.tools.map((t: any) => t.name)).toEqual([
      'search_concepts',
      'get_concept',
      'suggest_concepts_for_text',
      'list_releases',
    ]);
    expect(r.result.tools.every((t: any) => t.annotations.readOnlyHint)).toBe(
      true,
    );
  });

  it('answers nothing to a notification', async () => {
    expect(
      await mcp.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    ).toBeNull();
  });

  it('returns protocol errors for bad messages and unknown methods', async () => {
    expect(((await mcp.handle({ id: 1 })) as any).error.code).toBe(-32600);
    expect(
      ((await mcp.handle({ jsonrpc: '2.0', id: 1, method: 'nope' })) as any)
        .error.code,
    ).toBe(-32601);
    expect(((await call('nope', {})) as any).error.code).toBe(-32602);
  });

  it('gets a concept by exact label, and says so when it is not official', async () => {
    const ok = await call('get_concept', { label: 'ia' });
    expect(ok.result.isError).toBe(false);
    expect(ok.result.structuredContent.concept.term_id).toBe(2);
    const missing = await call('get_concept', { label: 'Resilience' });
    expect(missing.result.isError).toBe(true);
    expect(missing.result.content[0].text).toMatch(/not an official label/);
    read.list.mockResolvedValueOnce([
      concept(10, 'Indicator', [{ label: 'KPI', kind: GcLabelKind.ACRONYM }]),
      concept(11, 'Key performance indicator', [
        { label: 'KPI', kind: GcLabelKind.ACRONYM },
      ]),
    ]);
    const shared = await call('get_concept', { label: 'KPI' });
    expect(shared.result.structuredContent.ambiguous).toBe(true);
    expect(shared.result.structuredContent.concepts).toHaveLength(2);
    const byId = await call('get_concept', { term_id: 99 });
    expect(byId.result.isError).toBe(true);
  });

  it('searches only approved concepts by default and caps the page', async () => {
    const r = await call('search_concepts', { query: 'impact', limit: 1 });
    // No scheme in the call: the default one.
    expect(read.list).toHaveBeenLastCalledWith(
      'meliaf-taxonomy',
      expect.objectContaining({ q: 'impact', status: 'approved' }),
    );
    expect(r.result.structuredContent.concepts).toHaveLength(1);
    expect(r.result.structuredContent.total).toBe(3);
  });

  it('suggests concepts for a text without retaining it', async () => {
    const r = await call('suggest_concepts_for_text', {
      text: 'We ran an impact assessment',
    });
    expect(r.result.structuredContent.retained).toBe(false);
    expect(r.result.structuredContent.suggestions[0].term_id).toBe(2);
  });
});
