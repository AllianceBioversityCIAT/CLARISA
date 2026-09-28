import { Subject, of, throwError } from 'rxjs';
import { GlobalConceptsApiService, UsageSummary } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { GcUsagePanelComponent } from './gc-usage-panel.component';

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
    const api = { usage: jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second) };
    const component = new GcUsagePanelComponent(api as unknown as GlobalConceptsApiService);
    component.ngOnInit();
    component.setPeriod(7);

    second.next(summary(20));
    first.next(summary(99));
    expect(api.usage).toHaveBeenLastCalledWith('meliaf', 7);
    expect(component.view.kpis[0].value).toBe(20);
    expect(component.loading).toBe(false);
  });

  it('keeps the error to show, and hands a search with no result to the shell', () => {
    const api = { usage: jest.fn(() => throwError(() => ({ error: { message: 'Usage is off' } }))) };
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
});
