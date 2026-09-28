import { NotFoundException } from '@nestjs/common';
import { UsageService, normaliseSearch } from './usage.service';
import { ConceptGraphLoader } from './concept-graph.loader';
import { FakeManager, fakeDataSource } from '../utils/fake-manager.spec-helper';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcUsageDaily, GcUsageKind } from '../entities/gc-usage-daily.entity';

const flush = () => new Promise((r) => setImmediate(r));
const day = (offset = 0) =>
  new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

describe('UsageService', () => {
  let db: FakeManager;
  let service: UsageService;
  let meliaf: GcScheme;

  beforeEach(() => {
    db = new FakeManager();
    meliaf = db.seed(GcScheme, {
      code: 'meliaf',
      title: 'MELIAF',
      default_language: 'en',
      next_term_id: 1,
    });
    service = new UsageService(fakeDataSource(db), new ConceptGraphLoader());
  });

  describe('record', () => {
    it('bumps a counter with one atomic upsert that resolves the scheme inside', async () => {
      service.record('MELIAF', GcUsageKind.VIEW, 2374);
      await flush();
      expect(db.queries).toHaveLength(1);
      const { sql, params } = db.queries[0];
      expect(sql).toMatch(/INSERT INTO gc_usage_daily/);
      expect(sql).toMatch(/FROM gc_schemes s WHERE s\.code = \?/);
      expect(sql).toMatch(
        /ON DUPLICATE KEY UPDATE `count` = gc_usage_daily\.`count` \+ 1/,
      );
      expect(params).toEqual([day(), 'view', '2374', 'meliaf']);
    });

    it('is fire-and-forget: a failing database never throws nor rejects', async () => {
      const failing = new UsageService(
        {
          query: () => Promise.reject(new Error('table missing')),
        } as any,
        new ConceptGraphLoader(),
      );
      const warn = jest
        .spyOn((failing as any).logger, 'warn')
        .mockImplementation(() => undefined);
      expect(
        failing.record('meliaf', GcUsageKind.SEARCH, 'ia'),
      ).toBeUndefined();
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/table missing/));

      const throwing = new UsageService(
        {
          query: () => {
            throw new Error('pool closed');
          },
        } as any,
        new ConceptGraphLoader(),
      );
      jest
        .spyOn((throwing as any).logger, 'warn')
        .mockImplementation(() => undefined);
      expect(() =>
        throwing.record('meliaf', GcUsageKind.SEARCH, 'ia'),
      ).not.toThrow();
    });

    it('does not wait for the database', () => {
      let resolve!: () => void;
      const slow = new UsageService(
        { query: () => new Promise<void>((r) => (resolve = r)) } as any,
        new ConceptGraphLoader(),
      );
      // Returns synchronously while the INSERT is still pending.
      expect(slow.record('meliaf', GcUsageKind.VIEW, 1)).toBeUndefined();
      resolve();
    });

    it('normalises searches: trim, lower-case, collapsed spaces, 100 characters', () => {
      expect(normaliseSearch('  Theory   OF\tChange ')).toBe(
        'theory of change',
      );
      expect(normaliseSearch('x'.repeat(150))).toHaveLength(100);
      expect(normaliseSearch(undefined)).toBe('');
      expect(normaliseSearch(['a'])).toBe('');
    });

    it('records a search, a zero-result search, or a plain listing', async () => {
      service.recordList('meliaf', '  IA ', 3);
      service.recordList('meliaf', 'Unobtainium', 0);
      service.recordList('meliaf', '   ', 12);
      service.recordList('meliaf', undefined, 12);
      await flush();
      expect(db.queries.map((q) => [q.params[1], q.params[2]])).toEqual([
        ['search', 'ia'],
        ['search', 'unobtainium'],
        ['zero_search', 'unobtainium'],
        ['api', 'list'],
        ['api', 'list'],
      ]);
    });
  });

  describe('summary', () => {
    const count = (
      kind: GcUsageKind,
      item: string,
      n: number,
      offset = 0,
      scheme = meliaf,
    ) =>
      db.seed(GcUsageDaily, {
        day: day(offset),
        scheme_id: scheme.id,
        kind,
        item,
        count: n,
      } as Partial<GcUsageDaily>);

    it('adds up totals, days, tops and labels the viewed terms', async () => {
      db.seed(GcConcept, {
        scheme_id: meliaf.id,
        term_id: 7,
        preferred_label: 'Outcome',
        language: 'en',
        status: GcConceptStatus.APPROVED,
        version: '1.0',
      });
      count(GcUsageKind.SEARCH, 'ia', 5);
      count(GcUsageKind.SEARCH, 'ia', 2, 1);
      count(GcUsageKind.SEARCH, 'outcome', 3);
      count(GcUsageKind.ZERO_SEARCH, 'unobtainium', 4, 2);
      count(GcUsageKind.VIEW, '7', 9);
      count(GcUsageKind.VIEW, '8', 1, 1);
      count(GcUsageKind.EXPORT, 'csv', 2);
      count(GcUsageKind.MCP, 'search_concepts', 6);
      count(GcUsageKind.SUGGEST, 'text', 1);
      count(GcUsageKind.API, 'list', 50);
      // Outside the window and another scheme: ignored.
      count(GcUsageKind.SEARCH, 'old', 99, 40);
      const other = db.seed(GcScheme, {
        code: 'other',
        title: 'Other',
        default_language: 'en',
        next_term_id: 1,
      });
      count(GcUsageKind.SEARCH, 'elsewhere', 99, 0, other);

      const s = await service.summary('meliaf', 30);
      expect(s.days).toBe(30);
      expect(s.totals).toEqual({
        search: 10,
        zero_search: 4,
        view: 10,
        export: 2,
        mcp: 6,
        suggest: 1,
      });
      expect(s.by_day).toHaveLength(30);
      expect(s.by_day[29]).toEqual({ day: day(), search: 8, view: 9 });
      expect(s.by_day[28]).toEqual({ day: day(1), search: 2, view: 1 });
      expect(s.top_searches).toEqual([
        { item: 'ia', count: 7 },
        { item: 'outcome', count: 3 },
      ]);
      expect(s.zero_result_searches).toEqual([
        { item: 'unobtainium', count: 4 },
      ]);
      expect(s.top_viewed).toEqual([
        { term_id: 7, preferred_label: 'Outcome', count: 9 },
        { term_id: 8, preferred_label: null, count: 1 },
      ]);
    });

    it('clamps the window and answers 404 for an unknown scheme', async () => {
      expect((await service.summary('meliaf', 0)).days).toBe(30);
      expect((await service.summary('meliaf', 5000)).days).toBe(365);
      expect((await service.summary('meliaf', NaN)).days).toBe(30);
      await expect(service.summary('nope', 30)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
