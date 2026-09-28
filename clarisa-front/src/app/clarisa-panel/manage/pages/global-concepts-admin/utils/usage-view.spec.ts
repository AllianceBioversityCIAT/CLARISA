import { UsageSummary } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { fillDays, niceMax, usageViewModel } from './usage-view';

describe('usage view model', () => {
  const summary: UsageSummary = {
    days: 7,
    totals: { search: 40, zero_search: 10, view: 25, export: 3, mcp: 2, suggest: 1 },
    by_day: [
      { day: '2026-09-25', search: 12, view: 5 },
      { day: '2026-09-27', search: 8, view: 9 }
    ],
    top_searches: [{ item: 'outcome', count: 12 }],
    zero_result_searches: [{ item: 'theory of change', count: 4 }],
    top_viewed: [{ term_id: 7, preferred_label: 'Outcome', count: 9 }]
  };
  const today = new Date('2026-09-27T15:00:00Z');

  it('turns the totals into the six tiles, with the share of empty searches', () => {
    const view = usageViewModel(summary, 7, today);
    expect(view.kpis.map(kpi => [kpi.key, kpi.value])).toEqual([
      ['search', 40],
      ['zero_search', 10],
      ['view', 25],
      ['export', 3],
      ['mcp', 2],
      ['suggest', 1]
    ]);
    expect(view.zeroShare).toBe(25);
    expect(view.hasActivity).toBe(true);
  });

  it('draws every day of the period, zeros included, oldest first', () => {
    const days = fillDays(summary.by_day, 7, today);
    expect(days.length).toBe(7);
    expect(days[0].day).toBe('2026-09-21');
    expect(days[6]).toEqual({ day: '2026-09-27', search: 8, view: 9 });
    expect(days[5]).toEqual({ day: '2026-09-26', search: 0, view: 0 });
  });

  it('puts the axis on a round top and starts every path on the first day', () => {
    expect(niceMax(12)).toBe(20);
    expect(niceMax(0)).toBe(4);
    const { chart } = usageViewModel(summary, 7, today);
    expect(chart.max).toBe(20);
    expect(chart.searchPath.startsWith('M')).toBe(true);
    expect(chart.columns.length).toBe(7);
    expect(chart.labels.length).toBeGreaterThan(1);
  });

  it('shows an empty, still drawable chart without a summary', () => {
    const view = usageViewModel(null, 30, today);
    expect(view.hasActivity).toBe(false);
    expect(view.chart.points.length).toBe(30);
    expect(view.kpis.every(kpi => kpi.value === 0)).toBe(true);
  });
});
