import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import {
  GlobalConceptsApiService,
  PlatformUsage,
  PlatformUsageSystem,
  UsageSummary
} from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { GcUsagePanelComponent } from './gc-usage-panel.component';
import { platformRows } from '../../utils/usage-view';

declare const require: (id: string) => any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

const system = (mis_id: number | null, acronym: string, calls: number, errors = 0): PlatformUsageSystem => ({
  mis_id,
  acronym,
  name: `${acronym} system`,
  environment: 'TEST',
  calls,
  errors,
  avg_response_time_ms: 42,
  api_keys: 1,
  last_used_at: '2026-09-30T10:00:00Z'
});

const platformUsage = (systems: PlatformUsageSystem[], anonymous = 31, keyed = 9): PlatformUsage => ({
  scope: 'all-schemes',
  from: '2026-09-01',
  to: '2026-09-30',
  endpoint_prefixes: ['/api/concepts/', '/concepts/'],
  systems,
  platform_calls: systems.reduce((sum, s) => sum + s.calls, 0),
  counted_reads: { total: anonymous + keyed, keyed, anonymous }
});

describe('GcUsagePanelComponent', () => {
  const summary = (search: number): UsageSummary => ({
    days: 7,
    totals: { search, zero_search: 1, view: 2, export: 0, mcp: 0, suggest: 0 },
    by_day: [],
    top_searches: [],
    zero_result_searches: [{ item: 'theory of change', count: 3 }],
    top_viewed: []
  });

  it('loads the period asked for and draws only the last answer', () => {
    const first = new Subject<UsageSummary>();
    const second = new Subject<UsageSummary>();
    const api = {
      usage: jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second),
      usageByPlatform: jest.fn(() => of(platformUsage([])))
    };
    const component = new GcUsagePanelComponent(api as unknown as GlobalConceptsApiService);
    component.ngOnInit();
    component.setPeriod(7);

    second.next(summary(20));
    first.next(summary(99));
    expect(api.usage).toHaveBeenLastCalledWith('concepts', 7);
    expect(component.view.kpis[0].value).toBe(20);
    expect(component.loading).toBe(false);
  });

  it('keeps the error to show, and hands a search with no result to the shell', () => {
    const api = {
      usage: jest.fn(() => throwError(() => ({ error: { message: 'Usage is off' } }))),
      usageByPlatform: jest.fn(() => of(platformUsage([])))
    };
    const component = new GcUsagePanelComponent(api as unknown as GlobalConceptsApiService);
    const create = jest.fn();
    component.createConcept.subscribe(create);
    component.ngOnInit();
    expect(component.loadError).toBe('Usage is off');

    api.usage.mockReturnValue(of(summary(1)) as never);
    component.load();
    component.create('theory of change');
    expect(create).toHaveBeenCalledWith('theory of change');
  });

  describe('By platform', () => {
    const build = (answer: unknown) => {
      const api = {
        usage: jest.fn(() => of(summary(1))),
        usageByPlatform: jest.fn(() => answer)
      };
      const component = new GcUsagePanelComponent(api as unknown as GlobalConceptsApiService);
      component.ngOnInit();
      return { api, component };
    };

    it('asks for the same scheme and period as the figures, and again on a new period', () => {
      const { api, component } = build(of(platformUsage([])));
      expect(api.usageByPlatform).toHaveBeenCalledWith('concepts', 30);
      component.setPeriod(7);
      expect(api.usageByPlatform).toHaveBeenLastCalledWith('concepts', 7);
    });

    it('empty: no rows, the anonymous line still there', () => {
      const { component } = build(of(platformUsage([], 12, 0)));
      expect(component.platformRows).toEqual([]);
      expect(component.platforms?.counted_reads.anonymous).toBe(12);
      expect(component.platformsError).toBeNull();
    });

    it('one: a single system takes the whole bar and 100 %', () => {
      const { component } = build(of(platformUsage([system(3, 'PRMS', 8)])));
      expect(component.platformRows).toHaveLength(1);
      expect(component.platformRows[0]).toMatchObject({ acronym: 'PRMS', share: 100, bar: 100 });
    });

    it('many: busiest first, shares add up, the no-MIS bucket keeps its own key', () => {
      const rows = platformRows(platformUsage([system(null, 'No MIS', 10), system(3, 'PRMS', 30), system(7, 'STAR', 60)]));
      expect(rows.map(r => r.acronym)).toEqual(['STAR', 'PRMS', 'No MIS']);
      expect(rows.map(r => r.share)).toEqual([60, 30, 10]);
      expect(rows.map(r => r.bar)).toEqual([100, 50, 17]);
      expect(new Set(rows.map(r => r.key)).size).toBe(3);
      expect(platformRows(null)).toEqual([]);
    });

    it('error: its own message, the figures above untouched, and a retry', () => {
      const { api, component } = build(throwError(() => ({ error: { message: 'Forbidden resource' } })));
      expect(component.platformsError).toBe('Forbidden resource');
      expect(component.platformRows).toEqual([]);
      expect(component.loadError).toBeNull();
      expect(component.summary).not.toBeNull();

      api.usageByPlatform.mockReturnValue(of(platformUsage([system(3, 'PRMS', 2)])) as never);
      component.loadPlatforms();
      expect(component.platformsError).toBeNull();
      expect(component.platformRows).toHaveLength(1);
    });

    it('draws only the last answer when the period changes quickly', () => {
      const first = new Subject<PlatformUsage>();
      const second = new Subject<PlatformUsage>();
      const api = {
        usage: jest.fn(() => of(summary(1))),
        usageByPlatform: jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second)
      };
      const component = new GcUsagePanelComponent(api as unknown as GlobalConceptsApiService);
      component.ngOnInit();
      component.setPeriod(7);
      second.next(platformUsage([system(3, 'PRMS', 5)]));
      first.next(platformUsage([system(7, 'STAR', 99)]));
      expect(component.platformRows.map(r => r.acronym)).toEqual(['PRMS']);
      expect(component.platformsLoading).toBe(false);
    });

    describe('rendered', () => {
      const render = async (answer: unknown) => {
        const api = { usage: jest.fn(() => of(summary(1))), usageByPlatform: jest.fn(() => answer) };
        await TestBed.configureTestingModule({
          declarations: [GcUsagePanelComponent],
          schemas: [NO_ERRORS_SCHEMA],
          providers: [{ provide: GlobalConceptsApiService, useValue: api }]
        }).compileComponents();
        const fixture = TestBed.createComponent(GcUsagePanelComponent);
        fixture.detectChanges();
        return fixture.nativeElement.querySelector('.gc-platforms') as HTMLElement;
      };

      // p-table is not rendered here (primeng's ESM build does not load under
      // jest), so its empty message is checked in the template itself.
      it('empty: the template tells how platforms get counted', () => {
        const html = fs
          .readFileSync(path.join(__dirname, 'gc-usage-panel.component.html'), 'utf8')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ');
        expect(html).toContain('No connected system has read Concepts with its key in this period — platforms send X-API-Key to be counted.');
      });

      it('shows the anonymous reads next to the platforms', async () => {
        const el = await render(of(platformUsage([], 1234, 5)));
        const text = el.textContent!.replace(/\s+/g, ' ');
        expect(text).toContain('By platform');
        expect(text).toContain('Anonymous (no key)');
        expect(text).toContain('1,234');
        expect(text).toContain('5 of 1,239 came with a key');
        expect(el.querySelector('[role="alert"]')).toBeNull();
      });

      it('error: an alert with a retry, no table', async () => {
        const el = await render(throwError(() => ({ error: { message: 'Forbidden resource' } })));
        expect(el.querySelector('[role="alert"]')?.textContent).toContain('Forbidden resource');
        expect(el.querySelector('p-table')).toBeNull();
        expect(el.textContent).not.toContain('Anonymous (no key)');
      });
    });
  });
});
