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
    scheme: 'meliaf',
    term_id,
    term_uri: `https://api.clarisa.cgiar.org/concepts/meliaf/${term_id}`,
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

describe('McpService', () => {
  const read = {
    list: jest.fn(async () => REGISTER),
    get: jest.fn(async (_s: string, id: number) => {
      const c = REGISTER.find((x) => x.term_id === id);
      if (!c) throw new NotFoundException('Concept meliaf/99 was not found');
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
    const byId = await call('get_concept', { term_id: 99 });
    expect(byId.result.isError).toBe(true);
  });

  it('searches only approved concepts by default and caps the page', async () => {
    const r = await call('search_concepts', { query: 'impact', limit: 1 });
    expect(read.list).toHaveBeenLastCalledWith(
      'meliaf',
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
