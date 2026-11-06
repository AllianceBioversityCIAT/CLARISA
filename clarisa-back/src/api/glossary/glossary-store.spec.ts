import { BadRequestException } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { DataSource } from 'typeorm';
import {
  GlossaryStore,
  bumpMinor,
  conceptStatusOf,
  glossaryStateOf,
} from './glossary-store';
import { Glossary, GlossaryEditorialStatus } from './entities/glossary.entity';

type Row = Record<string, unknown>;

/** A `manager.query` that answers by SQL shape and records every statement. */
function fakeDb(
  concepts: Row[],
  labels: Row[] = [],
  scheme = { id: 1, next_term_id: 398 },
) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const taken = new Set(concepts.map((c) => Number(c.term_id)));
  const query = jest.fn(async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    const s = sql.replace(/\s+/g, ' ');
    if (s.includes('FROM gc_concepts c JOIN gc_schemes s')) {
      const termId = params[2];
      return concepts.filter(
        (c) => termId === undefined || Number(c.term_id) === Number(termId),
      );
    }
    if (s.startsWith('SELECT concept_id, label FROM gc_labels'))
      return labels.filter((l) =>
        (params as number[]).includes(Number(l.concept_id)),
      );
    if (s.startsWith('SELECT label FROM gc_labels'))
      return labels.filter((l) => Number(l.concept_id) === Number(params[0]));
    if (s.startsWith('SELECT id, term_id FROM gc_concepts WHERE id IN'))
      return concepts.filter((c) =>
        (params as number[]).includes(Number(c.id)),
      );
    if (s.startsWith('SELECT id, name, acronym FROM portfolios'))
      return (params as number[]).map((id) => ({
        id,
        name: `Portfolio ${id}`,
        acronym: `P${id}`,
      }));
    if (s.startsWith('SELECT id, next_term_id FROM gc_schemes'))
      return [scheme];
    if (s.startsWith('SELECT 1 FROM gc_concepts WHERE scheme_id'))
      return taken.has(Number(params[1])) ? [{ 1: 1 }] : [];
    if (s.startsWith('SELECT id FROM gc_collections')) return [{ id: 9 }];
    if (s.startsWith('INSERT INTO gc_concepts')) return { insertId: 500 };
    return [];
  });
  const store = new GlossaryStore({
    manager: { query },
  } as unknown as DataSource);
  const written = () =>
    calls
      .filter((c) => /^\s*(INSERT|UPDATE|DELETE)/.test(c.sql))
      .map((c) => c.sql.trim().split(/\s+/).slice(0, 3).join(' '));
  return { store, calls, query, written };
}

const META = {
  is_active: true,
  show_in_dashboard: false,
  group_id: null,
  reference_date: '2025-01-31',
  application_name: null,
  editorial_status: 'approved',
  created_at: '2022-08-04T00:00:00.000Z',
  updated_at: '2026-09-25T00:00:00.000Z',
  created_by: 1,
  updated_by: null,
  modification_justification: null,
};

const concept = (over: Row = {}, meta: Row = {}, extra: Row = {}): Row => ({
  id: 10,
  term_id: 391,
  preferred_label: '2030 outcome',
  definition: 'Final outcomes.',
  source_citation: 'Narrative',
  source_url: 'https://example.org',
  status: 'approved',
  version: '1.0',
  replaced_by_id: null,
  extra: JSON.stringify({
    portfolios: ['3'],
    _glossary: { ...META, ...meta },
    ...extra,
  }),
  ...over,
});

describe('GlossaryStore', () => {
  describe('reading: every v1 key comes from its place in the taxonomy', () => {
    it('term, definition, provenance, labels in order, portfolios and termId', async () => {
      const { store } = fakeDb(
        [concept()],
        [
          { concept_id: 10, label: 'Outcome 2030' },
          { concept_id: 10, label: '2030 result' },
        ],
      );
      const [g] = await store.all();
      expect(instanceToPlain(g)).toEqual({
        term: '2030 outcome',
        definition: 'Final outcomes.',
        source: 'Narrative',
        sourceUrl: 'https://example.org',
        referenceDate: '2025-01-31',
        groupId: 391,
        termId: 391,
        editorialStatus: 'approved',
        replacedByTermId: null,
        alternativeLabels: ['Outcome 2030', '2030 result'],
        portfolios: [{ id: 3, name: 'Portfolio 3', acronym: 'P3' }],
      });
      expect(g.auditableFields.created_at.toISOString()).toBe(META.created_at);
    });

    it('the replacement travels as its termId, not the internal concept id', async () => {
      const { store } = fakeDb([
        concept(
          { id: 11, term_id: 278, replaced_by_id: 10 },
          { editorial_status: 'deprecated' },
        ),
        concept(),
      ]);
      const g = (await store.all()).find((x) => Number(x.id) === 278);
      expect(g.replacedByTermId).toBe(391);
    });

    it('a group id stored for the row itself or for another row is kept', async () => {
      const { store } = fakeDb([concept({}, { group_id: 290 })]);
      expect((await store.byId(391)).groupId).toBe(290);
    });

    it('a term that is not in the glossary collection is not found', async () => {
      const { store } = fakeDb([]);
      await expect(store.byId(391)).resolves.toBeNull();
      await expect(store.portfolioIds(391)).resolves.toEqual([]);
    });
  });

  describe('editorial status and active flag (glossaryStateOf)', () => {
    it.each([
      // meta editorial, meta active, concept status → editorial, active
      ['approved', true, 'approved', 'approved', true],
      ['approved', false, 'deprecated', 'approved', false],
      ['deprecated', true, 'deprecated', 'deprecated', true],
      ['draft', true, 'draft', 'draft', true],
      // changed from the taxonomy afterwards: its status wins
      ['approved', true, 'deprecated', 'approved', false],
      ['approved', false, 'approved', 'approved', true],
      ['deprecated', true, 'approved', 'approved', true],
      ['approved', true, 'in_review', 'in_review', true],
    ])(
      'glossary %s/%s, concept %s → %s, active %s',
      (editorial, active, status, wantEditorial, wantActive) => {
        expect(
          glossaryStateOf(
            { editorial_status: editorial, is_active: active },
            status,
          ),
        ).toEqual({ editorial: wantEditorial, isActive: wantActive });
      },
    );

    it('a concept without glossary data reads from its status', () => {
      expect(glossaryStateOf({}, 'deprecated')).toEqual({
        editorial: 'deprecated',
        isActive: false,
      });
      expect(glossaryStateOf({}, 'approved')).toEqual({
        editorial: 'approved',
        isActive: true,
      });
    });

    it('conceptStatusOf: an inactive published term is deprecated, a draft stays a draft', () => {
      expect(conceptStatusOf('approved', false)).toBe('deprecated');
      expect(conceptStatusOf('draft', false)).toBe('draft');
      expect(conceptStatusOf(null, true)).toBe('approved');
      expect(bumpMinor('1.9')).toBe('1.10');
    });
  });

  describe('writing', () => {
    const newTerm = () => {
      const g = new Glossary();
      g.title = 'New term';
      g.definition = 'Defined.';
      g.alternative_labels = JSON.stringify(['NT']);
      g.editorial_status = GlossaryEditorialStatus.APPROVED;
      g.show_in_dashboard = false;
      g.auditableFields = {
        is_active: true,
        created_by: 7,
      } as Glossary['auditableFields'];
      return g;
    };

    it('a new term takes the next free TERM ID, moves the counter, joins the collection and is logged', async () => {
      const { store, calls, written } = fakeDb([concept({ term_id: 398 })]);
      const g = newTerm();
      await store.save(g, undefined, { userId: 7, email: 'a@cgiar.org' });
      expect(g.id).toBe(399); // 398 is taken
      const counter = calls.find((c) => c.sql.startsWith('UPDATE gc_schemes'));
      expect(counter.params).toEqual([400, 1]);
      expect(written()).toEqual([
        'UPDATE gc_schemes SET',
        'INSERT INTO gc_concepts',
        'INSERT INTO gc_collection_members',
        'INSERT INTO gc_labels',
        'INSERT INTO gc_history',
      ]);
      const insert = calls.find((c) =>
        c.sql.includes('INSERT INTO gc_concepts'),
      );
      const extra = JSON.parse(insert.params[10] as string);
      expect(extra._glossary).toMatchObject({
        is_active: true,
        editorial_status: 'approved',
        created_by: 7,
      });
      expect(calls.find((c) => c.sql.includes('FOR UPDATE'))).toBeDefined();
    });

    it('saving a term with nothing changed writes nothing', async () => {
      const { store, written } = fakeDb([concept()]);
      const g = await store.byId(391);
      await store.save(g);
      expect(written()).toEqual([]);
    });

    it('a new definition updates the row, revises the published version and logs the change', async () => {
      const { store, calls, written } = fakeDb([concept()]);
      const g = await store.byId(391);
      g.definition = 'Edited.';
      await store.save(g, undefined, { email: 'a@cgiar.org' });
      expect(written()).toEqual([
        'UPDATE gc_concepts SET',
        'INSERT INTO gc_history',
      ]);
      const update = calls.find((c) => c.sql.includes('UPDATE gc_concepts'));
      expect(update.params[1]).toBe('Edited.');
      expect(update.params[6]).toBe('1.1');
      const log = calls.find((c) => c.sql.includes('INSERT INTO gc_history'));
      expect(JSON.parse(log.params[2] as string)).toEqual({
        definition: { from: 'Final outcomes.', to: 'Edited.' },
      });
    });

    it('deactivating keeps the extra keys of the taxonomy and deprecates the concept', async () => {
      const { store, calls } = fakeDb([
        concept({}, {}, { custom_note: 'kept' }),
      ]);
      const g = await store.byId(391);
      g.auditableFields.is_active = false;
      await store.save(g);
      const update = calls.find((c) => c.sql.includes('UPDATE gc_concepts'));
      expect(update.params[4]).toBe('deprecated');
      const extra = JSON.parse(update.params[8] as string);
      expect(extra.custom_note).toBe('kept');
      expect(extra.portfolios).toEqual(['3']);
      expect(extra._glossary.is_active).toBe(false);
    });

    it('a term of an unknown id is refused, never created with that id', async () => {
      const { store } = fakeDb([]);
      const g = newTerm();
      g.id = 12345;
      await expect(store.save(g)).rejects.toThrow(
        'Glossary term 12345 was not found',
      );
    });

    it('a term longer than the taxonomy column is refused', async () => {
      const { store } = fakeDb([]);
      const g = newTerm();
      g.title = 'x'.repeat(501);
      await expect(store.save(g)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('portfolios: the kept ones stay in place, new ones go last, same list writes nothing', async () => {
      const { store, calls, written } = fakeDb([
        concept({}, {}, { portfolios: ['3', '2'] }),
      ]);
      await store.setPortfolios(391, [2, 3]);
      expect(written()).toEqual([]);
      await store.setPortfolios(391, [2, 1], undefined, { userId: 7 });
      const update = calls.find((c) =>
        c.sql.startsWith('UPDATE gc_concepts SET extra'),
      );
      expect(JSON.parse(update.params[0] as string).portfolios).toEqual([
        '2',
        '1',
      ]);
    });
  });
});
