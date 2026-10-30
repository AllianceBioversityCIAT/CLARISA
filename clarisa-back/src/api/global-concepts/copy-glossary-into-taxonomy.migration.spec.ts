import { CopyGlossaryIntoTaxonomy1793404800000 as Migration } from '../../../migrations/1793404800000-CopyGlossaryIntoTaxonomy';

type Call = [string, unknown[]];

const SCHEME = { id: 7, code: 'meliaf-taxonomy', next_term_id: 1 };
const PORTFOLIOS = [
  { id: 1, name: 'CGIAR portfolio 2016-2021', acronym: null, is_active: 0 },
  {
    id: 2,
    name: 'CGIAR portfolio 2022-2024\u200b',
    acronym: 'P22',
    is_active: 1,
  },
  { id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25', is_active: 1 },
  { id: 4, name: 'CGIAR general\u200b', acronym: null, is_active: 1 },
];
const ROWS = [
  {
    id: 5,
    title: 'Impact',
    definition: 'A lasting change.',
    source: null,
    source_url: null,
    reference_date: null,
    group_id: null,
    alternative_labels: '["IA", " ia ", "", 7]',
    editorial_status: 'approved',
    replaced_by_id: null,
    show_in_dashboard: 0,
    is_active: 1,
    application_name: null,
    created_on: '2022-05-01',
    updated_on: '2024-02-10',
  },
  {
    id: 9,
    title: 'Impact (old)',
    definition: 'Older wording.',
    source: 'CGIAR 2022-2024 Portfolio',
    source_url: 'https://example.org/p22',
    reference_date: '2024-01-31',
    group_id: 5,
    alternative_labels: null,
    editorial_status: 'deprecated',
    replaced_by_id: 5,
    show_in_dashboard: 1,
    is_active: 0,
    application_name: 'PRMS',
    created_on: '2022-05-01',
    updated_on: null,
  },
  {
    id: 12,
    title: 'Legacy term',
    definition: 'No status stored.',
    source: null,
    source_url: null,
    reference_date: null,
    group_id: null,
    alternative_labels: 'not json',
    editorial_status: null,
    replaced_by_id: null,
    show_in_dashboard: 0,
    is_active: 1,
    application_name: null,
    created_on: null,
    updated_on: null,
  },
];
const LINKS = [
  { glossary_id: 5, portfolio_id: 2 },
  { glossary_id: 5, portfolio_id: 3 },
  { glossary_id: 9, portfolio_id: 2 },
];

type Options = {
  scheme?: typeof SCHEME | null;
  existing?: { id: number; term_id: number; extra: string | null }[];
  insertId?: boolean;
};

const run = async (dir: 'up' | 'down', opts: Options = {}) => {
  let nextId = 100;
  const query = jest.fn(async (sql: string, _params?: unknown[]) => {
    if (/SELECT id(, code, next_term_id)? FROM gc_schemes/.test(sql))
      return opts.scheme === null ? [] : [opts.scheme ?? SCHEME];
    if (/FROM portfolios/.test(sql)) return PORTFOLIOS;
    if (/SELECT id FROM gc_collections/.test(sql)) return [{ id: 11 }];
    if (/FROM glossary ORDER BY id/.test(sql)) return ROWS;
    if (/FROM glossary_portfolios/.test(sql)) return LINKS;
    if (/SELECT id, term_id, extra FROM gc_concepts/.test(sql))
      return opts.existing ?? [];
    if (/^\s*INSERT INTO gc_concepts/.test(sql))
      return opts.insertId === false ? {} : { insertId: ++nextId };
    if (
      /SELECT id FROM gc_concepts WHERE scheme_id = \? AND term_id = \?/.test(
        sql,
      )
    )
      return [{ id: 900 }];
    return undefined;
  });
  await new Migration()[dir]({ query } as any);
  return query.mock.calls.map(([sql, params]) => [
    String(sql).replace(/\s+/g, ' ').trim(),
    (params ?? []) as unknown[],
  ]) as Call[];
};
const find = (calls: Call[], re: RegExp) =>
  calls.filter(([sql]) => re.test(sql));
const extraOf = (params: unknown[]) =>
  JSON.parse(String(params[params.length - 1])) as Record<string, unknown>;

describe('CopyGlossaryIntoTaxonomy1793404800000', () => {
  describe('helpers', () => {
    it('labels a portfolio with acronym and name, without zero-width spaces', () => {
      expect(Migration.listLabel(PORTFOLIOS[1])).toBe(
        'P22 — CGIAR portfolio 2022-2024',
      );
      expect(Migration.listLabel(PORTFOLIOS[3])).toBe('CGIAR general');
    });

    it('recognises the copy mark only in a JSON object', () => {
      expect(Migration.isCopy('{"_glossary":{"is_active":true}}')).toBe(true);
      expect(Migration.isCopy('{"portfolios":["2"]}')).toBe(false);
      expect(Migration.isCopy('["_glossary"]')).toBe(false);
      expect(Migration.isCopy('_glossary')).toBe(false);
      expect(Migration.isCopy(null)).toBe(false);
    });

    it('reads alternative labels like the glossary does and drops case duplicates', () => {
      expect(
        Migration.altLabels('["IA", " ia ", "", 7, "Impact assessment"]'),
      ).toEqual(['IA', 'Impact assessment']);
      expect(Migration.altLabels('not json')).toEqual([]);
      expect(Migration.altLabels(null)).toEqual([]);
    });

    it('maps a glossary row to a concept keeping termId, status and the v1-only fields', () => {
      const c = Migration.conceptRow(ROWS[1], ['2']);
      expect(c).toMatchObject({
        term_id: 9,
        preferred_label: 'Impact (old)',
        definition: 'Older wording.',
        source_citation: 'CGIAR 2022-2024 Portfolio',
        source_url: 'https://example.org/p22',
        status: 'deprecated',
        date_created: '2022-05-01',
        date_modified: '2022-05-01',
      });
      expect(JSON.parse(c.extra)).toEqual({
        portfolios: ['2'],
        _glossary: {
          is_active: false,
          show_in_dashboard: true,
          group_id: 5,
          reference_date: '2024-01-31',
          application_name: 'PRMS',
        },
      });
    });

    it('a row with no status is approved, its own group, and carries no portfolios key', () => {
      const c = Migration.conceptRow(ROWS[2], []);
      expect(c.status).toBe('approved');
      expect(JSON.parse(c.extra)).toEqual({
        _glossary: {
          is_active: true,
          show_in_dashboard: false,
          group_id: 12,
          reference_date: null,
          application_name: null,
        },
      });
    });
  });

  describe('up', () => {
    it('writes nothing when the scheme does not exist', async () => {
      const calls = await run('up', { scheme: null });
      expect(calls).toHaveLength(1);
    });

    it('seeds the portfolios list (value = id, retired portfolio = inactive value), the multi_list field and the collection, all guarded by NOT EXISTS', async () => {
      const calls = await run('up');
      const lists = find(calls, /INSERT INTO gc_lists/);
      expect(lists.map(([, p]) => p.slice(0, 6))).toEqual([
        [
          'meliaf-taxonomy',
          'portfolios',
          '1',
          'CGIAR portfolio 2016-2021',
          0,
          0,
        ],
        [
          'meliaf-taxonomy',
          'portfolios',
          '2',
          'P22 — CGIAR portfolio 2022-2024',
          1,
          1,
        ],
        [
          'meliaf-taxonomy',
          'portfolios',
          '3',
          'P25 — CGIAR portfolio 2025-2030',
          2,
          1,
        ],
        ['meliaf-taxonomy', 'portfolios', '4', 'CGIAR general', 3, 1],
      ]);
      const [field] = find(calls, /INSERT INTO gc_fields/);
      expect(field[0]).toMatch(/'multi_list'/);
      expect(field[0]).toMatch(/WHERE NOT EXISTS/);
      expect(field[1].slice(0, 4)).toEqual([
        7,
        'portfolios',
        'Portfolios',
        'portfolios',
      ]);
      const [collection] = find(calls, /INSERT INTO gc_collections/);
      expect(collection[0]).toMatch(/WHERE NOT EXISTS/);
      expect(collection[1]).toEqual([7, 'glossary', 'Glossary', 7, 'glossary']);
      for (const [sql] of [...lists, field, collection])
        expect(sql).toMatch(/WHERE NOT EXISTS/);
    });

    it('copies every glossary row as a concept with its term_id, labels, history and membership', async () => {
      const calls = await run('up');
      const concepts = find(calls, /^INSERT INTO gc_concepts/);
      expect(concepts.map(([, p]) => [p[0], p[1], p[2], p[6]])).toEqual([
        [7, 5, 'Impact', 'approved'],
        [7, 9, 'Impact (old)', 'deprecated'],
        [7, 12, 'Legacy term', 'approved'],
      ]);
      expect(extraOf(concepts[0][1])).toEqual({
        portfolios: ['2', '3'],
        _glossary: {
          is_active: true,
          show_in_dashboard: false,
          group_id: 5,
          reference_date: null,
          application_name: null,
        },
      });
      expect(find(calls, /INSERT INTO gc_labels/).map(([, p]) => p)).toEqual([
        [101, 'IA'],
      ]);
      const history = find(calls, /INSERT INTO gc_history/);
      expect(history.map(([, p]) => p[0])).toEqual([101, 102, 103]);
      expect(history[0][0]).toMatch(/'create'/);
      expect(JSON.parse(String(history[0][1][1]))).toMatchObject({
        preferred_label: { from: null, to: 'Impact' },
        status: { from: null, to: 'approved' },
        extra: { from: null, to: { portfolios: ['2', '3'] } },
      });
      expect(history.every(([, p]) => p[2] === history[0][1][2])).toBe(true);
      expect(
        find(calls, /INSERT INTO gc_collection_members/).map(([, p]) => p),
      ).toEqual([
        [11, 101, 11, 101],
        [11, 102, 11, 102],
        [11, 103, 11, 103],
      ]);
    });

    it('resolves replaced_by to the copied replacement and bumps next_term_id past the glossary ids', async () => {
      const calls = await run('up');
      expect(
        find(calls, /UPDATE gc_concepts SET replaced_by_id/).map(([, p]) => p),
      ).toEqual([[101, 102]]);
      expect(find(calls, /UPDATE gc_schemes SET next_term_id/)[0][1]).toEqual([
        13, 7,
      ]);
    });

    it('falls back to a SELECT when the driver returns no insertId', async () => {
      const calls = await run('up', { insertId: false });
      expect(
        find(
          calls,
          /SELECT id FROM gc_concepts WHERE scheme_id = \? AND term_id = \?/,
        ),
      ).toHaveLength(3);
      expect(find(calls, /INSERT INTO gc_collection_members/)[0][1]).toEqual([
        11, 900, 11, 900,
      ]);
    });

    it('is idempotent: a copied term is not inserted again, only kept in the collection', async () => {
      const calls = await run('up', {
        existing: [
          { id: 55, term_id: 5, extra: '{"_glossary":{"is_active":true}}' },
        ],
      });
      const concepts = find(calls, /^INSERT INTO gc_concepts/);
      expect(concepts.map(([, p]) => p[1])).toEqual([9, 12]);
      expect(
        find(calls, /INSERT INTO gc_collection_members/).map(([, p]) => p[1]),
      ).toEqual([55, 101, 102]);
      expect(
        find(calls, /UPDATE gc_concepts SET replaced_by_id/).map(([, p]) => p),
      ).toEqual([[55, 101]]);
    });

    it('never overwrites a concept of another origin that already owns the term_id', async () => {
      const calls = await run('up', {
        existing: [{ id: 56, term_id: 5, extra: '{"audiences":["donors"]}' }],
      });
      expect(
        find(calls, /^INSERT INTO gc_concepts/).map(([, p]) => p[1]),
      ).toEqual([9, 12]);
      expect(
        find(calls, /INSERT INTO gc_collection_members/).map(([, p]) => p[1]),
      ).toEqual([101, 102]);
      // Its replacement was not copied, so the deprecated term points nowhere.
      expect(find(calls, /UPDATE gc_concepts SET replaced_by_id/)).toEqual([]);
      expect(find(calls, /UPDATE gc_schemes SET next_term_id/)[0][1]).toEqual([
        13, 7,
      ]);
    });

    it('leaves next_term_id alone when the scheme is already past the glossary ids', async () => {
      const calls = await run('up', {
        scheme: { ...SCHEME, next_term_id: 500 },
      });
      expect(find(calls, /UPDATE gc_schemes/)).toEqual([]);
    });
  });

  describe('down', () => {
    const existing = [
      { id: 55, term_id: 5, extra: '{"_glossary":{"is_active":true}}' },
      { id: 56, term_id: 6, extra: '{"notes":"mentions _glossary"}' },
    ];

    it('removes only the marked concepts with everything hanging from them, then the empty collection', async () => {
      const calls = await run('down', { existing });
      expect(
        find(calls, /SELECT id, term_id, extra FROM gc_concepts/)[0][1],
      ).toEqual([7, '%"_glossary"%']);
      const deletes = find(calls, /^DELETE FROM/);
      expect(deletes.map(([sql, p]) => [sql.split(' ')[2], p])).toEqual([
        ['gc_collection_members', [55]],
        ['gc_labels', [55]],
        ['gc_history', [55]],
        ['gc_mappings', [55]],
        ['gc_icons', [55]],
        ['gc_embeddings', [55]],
        ['gc_relations', [55, 55]],
        ['gc_concepts', [55]],
        ['gc_collections', [7, 'glossary']],
      ]);
      expect(deletes[6][0]).toMatch(/related_concept_id IN/);
      expect(
        find(calls, /UPDATE gc_concepts SET replaced_by_id = NULL/)[0][1],
      ).toEqual([55]);
      expect(deletes[8][0]).toMatch(/NOT EXISTS/);
    });

    it('deletes no concept when none is marked', async () => {
      const calls = await run('down', { existing: [existing[1]] });
      expect(find(calls, /DELETE FROM gc_concepts/)).toEqual([]);
      expect(find(calls, /DELETE FROM gc_collections/)).toHaveLength(1);
    });
  });
});
