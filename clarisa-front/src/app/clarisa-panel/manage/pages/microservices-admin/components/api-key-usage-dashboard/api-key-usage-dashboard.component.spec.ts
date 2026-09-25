import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ManageApiService, UsageOverview } from '../../../../services/manage-api.service';
import { NO_SYSTEM_COLOR, SYSTEM_PALETTE } from '../../utils/chart-geometry';
import { ApiKeyUsageDashboardComponent } from './api-key-usage-dashboard.component';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const overview = (over: Partial<UsageOverview> = {}): UsageOverview => ({
  period: { from: new Date(Date.now() - 29 * 86_400_000).toISOString(), to: new Date().toISOString() },
  granularity: 'day',
  systems: [
    {
      mis_id: 3,
      acronym: 'PRMS',
      name: 'Performance Results Management System',
      environment: 'PROD',
      calls: 300,
      errors: 3,
      avg_response_time_ms: 200,
      api_keys: 2,
      last_used_at: null
    },
    {
      mis_id: 5,
      acronym: 'AICCRA',
      name: 'AICCRA',
      environment: 'PROD',
      calls: 100,
      errors: 5,
      avg_response_time_ms: 450,
      api_keys: 1,
      last_used_at: null
    },
    {
      mis_id: null,
      acronym: 'No MIS',
      name: 'Keys not linked to any system',
      environment: null,
      calls: 10,
      errors: 0,
      avg_response_time_ms: 100,
      api_keys: 1,
      last_used_at: null
    }
  ],
  series: [
    { bucket: today(), mis_id: 3, calls: 300, errors: 3, avg_response_time_ms: 200 },
    { bucket: today(), mis_id: 5, calls: 100, errors: 5, avg_response_time_ms: 450 }
  ],
  heatmap: [
    { day_of_week: 2, hour: 10, mis_id: 3, calls: 200 },
    { day_of_week: 1, hour: 3, mis_id: 5, calls: 5 }
  ],
  ...over
});

describe('ApiKeyUsageDashboardComponent', () => {
  let component: ApiKeyUsageDashboardComponent;
  let fixture: ComponentFixture<ApiKeyUsageDashboardComponent>;

  const api = {
    getApiReferenceCatalog: jest.fn(),
    getAllMis: jest.fn(),
    getAllApiKeys: jest.fn(),
    getApiKeyUsageOverview: jest.fn(),
    getApiKeyUsageByEndpoint: jest.fn(),
    getApiKeyUsageLogs: jest.fn(),
    getApiKeyUsage: jest.fn()
  };
  const router = { navigate: jest.fn() };

  const build = async (params: Record<string, string> = {}) => {
    const queryParams = new BehaviorSubject(convertToParamMap(params));
    await TestBed.configureTestingModule({
      declarations: [ApiKeyUsageDashboardComponent],
      imports: [FormsModule],
      providers: [
        MessageService,
        { provide: ManageApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams.asObservable() } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(ApiKeyUsageDashboardComponent, { set: { template: '<div></div>' } })
      .compileComponents();
    fixture = TestBed.createComponent(ApiKeyUsageDashboardComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api.getApiReferenceCatalog.mockReturnValue(
      of({
        groups: [
          {
            group: 'Control List',
            categories: [{ name: 'Institutions', endpoints: [{ name: 'Institutions', route: 'api/institutions', method: 'get' }] }]
          }
        ]
      })
    );
    api.getAllMis.mockReturnValue(
      of([
        { id: 3, acronym: 'PRMS', name: 'PRMS', environment: 'PROD' },
        { id: 5, acronym: 'AICCRA', name: 'AICCRA', environment: 'PROD' },
        { id: 9, acronym: 'MEL', name: 'Monitoring, Evaluation and Learning', environment: 'TEST' }
      ])
    );
    api.getAllApiKeys.mockReturnValue(
      of([
        {
          id: 1,
          name: 'Reporting Tool',
          key_prefix: 'cl_prod_a',
          mis_id: 3,
          environment: 'PROD',
          description: 'PRMS',
          is_active: true,
          last_used_at: new Date().toISOString()
        },
        {
          id: 2,
          name: 'AICCRA',
          key_prefix: 'cl_prod_b',
          mis_id: 5,
          environment: 'PROD',
          description: '',
          is_active: true,
          last_used_at: null,
          expires_at: new Date(Date.now() + 5 * 86_400_000).toISOString()
        },
        { id: 3, name: 'Old', key_prefix: 'cl_test_c', mis_id: 3, environment: 'TEST', is_active: false }
      ])
    );
    api.getApiKeyUsageOverview.mockReturnValue(of(overview()));
    api.getApiKeyUsageByEndpoint.mockReturnValue(
      of({
        period: { from: '', to: '' },
        total_requests: 400,
        items: [
          {
            microservice_name: 'clarisa-api',
            endpoint: '/api/institutions/get/221',
            http_method: 'GET',
            total_requests: 400,
            error_count: 4,
            avg_response_time_ms: 200,
            unique_api_keys: 2,
            last_used_at: null,
            consumers: [
              {
                api_key_id: 1,
                api_key_name: 'Reporting Tool',
                key_prefix: 'cl_prod_a',
                mis_id: 3,
                mis_acronym: 'PRMS',
                total_requests: 300,
                last_used_at: null
              },
              {
                api_key_id: 2,
                api_key_name: 'AICCRA',
                key_prefix: 'cl_prod_b',
                mis_id: 5,
                mis_acronym: 'AICCRA',
                total_requests: 100,
                last_used_at: null
              }
            ]
          }
        ]
      })
    );
    api.getApiKeyUsageLogs.mockReturnValue(of({ period: { from: '', to: '' }, total: 0, items: [] }));
    api.getApiKeyUsage.mockReturnValue(
      of({ api_key: { id: 1 }, totals: {}, time_series: [{ date: today(), count: 4 }], by_microservice: [], top_endpoints: [] })
    );
  });

  afterEach(() => TestBed.resetTestingModule());

  it('loads the current and previous period, the year and the endpoints in one go', async () => {
    await build();
    expect(api.getApiKeyUsageOverview).toHaveBeenCalledTimes(3);
    const [current, previous] = api.getApiKeyUsageOverview.mock.calls.map(c => c[0]);
    expect(current.granularity).toBe('day');
    expect(new Date(previous.to).getTime()).toBeLessThan(new Date(current.from).getTime());
    expect(api.getApiKeyUsageByEndpoint).toHaveBeenCalledTimes(1);
    expect(api.getApiKeyUsageLogs).toHaveBeenCalledWith(expect.objectContaining({ limit: 25, offset: 0 }));
    expect(api.getApiKeyUsageLogs).toHaveBeenCalledWith(expect.objectContaining({ limit: 8 }));
  });

  it('colors systems by volume, grays the no-MIS bucket and lists silent registered systems too', async () => {
    await build();
    expect(component.systems.map(s => [s.label, s.color])).toEqual([
      ['PRMS', SYSTEM_PALETTE[0]],
      ['AICCRA', SYSTEM_PALETTE[1]],
      ['No MIS', NO_SYSTEM_COLOR],
      ['MEL', SYSTEM_PALETTE[2]]
    ]);
    expect(component.selected).toEqual([3, 5, 0]);
  });

  it('figures follow the selection, with deltas against the previous period', async () => {
    api.getApiKeyUsageOverview
      .mockReturnValueOnce(of(overview()))
      .mockReturnValueOnce(
        of(
          overview({
            systems: [
              {
                mis_id: 3,
                acronym: 'PRMS',
                name: 'PRMS',
                environment: 'PROD',
                calls: 200,
                errors: 4,
                avg_response_time_ms: 250,
                api_keys: 2,
                last_used_at: null
              }
            ]
          })
        )
      );
    await build();

    const kpi = (label: string) => component.kpis.find(k => k.label === label)!;
    expect(kpi('Calls').value).toBe('410');
    expect(kpi('Calls').delta).toEqual({ text: '▲ 105.0%', tone: 'good' });
    expect(kpi('Systems consuming').value).toBe('2');
    expect(kpi('Systems consuming').caption).toContain('of 3 registered MIS');
    expect(kpi('Active keys').value).toBe('2');
    expect(kpi('Active keys').caption).toBe('1 expire in the next 30 days');
    expect(kpi('Idle keys').value).toBe('1');

    component.onSelectionChange([3]);
    expect(kpi('Calls').value).toBe('300');
    expect(kpi('Calls').delta).toEqual({ text: '▲ 50.0%', tone: 'good' });
    expect(kpi('Error rate').value).toBe('1.00%');
    expect(kpi('Error rate').delta).toEqual({ text: '▼ 1.00 pts', tone: 'good' });
    expect(kpi('Avg response time').delta?.tone).toBe('good');
    expect(api.getApiKeyUsageLogs).toHaveBeenLastCalledWith(expect.objectContaining({ mis_ids: '3' }));
  });

  it('turning comparison off drops every delta', async () => {
    await build();
    component.toggleCompare();
    expect(component.kpis.every(k => k.delta === null)).toBe(true);
  });

  it('draws one stacked series per selected system with calls, and switches metric', async () => {
    await build();
    expect(component.chartSeries.map(s => s.label)).toEqual(['PRMS', 'AICCRA']);
    expect(component.chartLabels.length).toBeGreaterThanOrEqual(29);
    expect(component.chartSeries[0].values[component.chartLabels.indexOf(today())]).toBe(300);

    component.setMetric('latency');
    expect(component.chartSeries[1].values[component.chartLabels.indexOf(today())]).toBe(450);
  });

  it('builds the flow from systems to catalogue endpoints, folding path params', async () => {
    await build();
    expect(component.flowLeft.map(n => [n.label, n.value])).toEqual([
      ['PRMS', 300],
      ['AICCRA', 100]
    ]);
    expect(component.flowRight.map(n => n.label)).toEqual(['/api/institutions']);
    expect(component.topEndpoints[0].parts.map(p => p.label)).toEqual(['PRMS', 'AICCRA']);

    component.flowFocus = '5';
    expect(component.flowFoot).toBe('AICCRA sends 100% of its calls to /api/institutions');
  });

  it('maps MySQL weekdays onto Monday-first rows', async () => {
    await build();
    expect(component.heat[0][10].value).toBe(200);
    expect(component.heat[6][3].value).toBe(5);
    expect(component.heatPeak).toBe('03:00 and 10:00');
  });

  it('rates health and names why a system is flagged', async () => {
    await build();
    const aiccra = component.health.find(h => h.label === 'AICCRA')!;
    expect(aiccra.rate).toBe(95);
    expect(aiccra.status).toBe('bad');
    expect(component.statusLabel('slow')).toBe('Slow');
    expect(component.health[0].label).toBe('AICCRA');
  });

  it('lists what needs attention: expiring, idle, undocumented keys and silent systems', async () => {
    await build();
    expect(component.attention.map(a => a.title)).toEqual([
      '1 key expires within 30 days',
      '1 active key has no calls in 60+ days',
      '1 key has no description',
      // the silent systems look at the whole registry, selected or not
      '1 registered system made no calls in the period'
    ]);
    component.onSelectionChange([3]);
    expect(component.attention.map(a => a.title)).toEqual(['1 registered system made no calls in the period']);
  });

  it('never selects nothing and keeps the choice when the period changes', async () => {
    await build();
    component.removeSystem(3);
    component.removeSystem(5);
    component.removeSystem(0);
    expect(component.selected).toEqual([0]);

    component.onSelectionChange([5]);
    component.setRange('90d');
    expect(component.selected).toEqual([5]);
    const calls = api.getApiKeyUsageOverview.mock.calls;
    expect(calls[calls.length - 2][0].granularity).toBe('week');
  });

  it('custom range waits for Apply and refuses a reversed range', async () => {
    await build();
    const before = api.getApiKeyUsageOverview.mock.calls.length;
    component.setRange('custom');
    expect(component.customFrom).not.toBeNull();
    expect(api.getApiKeyUsageOverview.mock.calls.length).toBe(before);

    component.customFrom = new Date('2026-09-10');
    component.customTo = new Date('2026-09-01');
    component.applyCustomRange();
    expect(api.getApiKeyUsageOverview.mock.calls.length).toBe(before);
  });

  it('opens the key detail from ?api_key and closes it through the URL', async () => {
    await build({ api_key: '1' });
    expect(api.getApiKeyUsage).toHaveBeenCalledWith(1, expect.any(Object));
    expect(component.keyDetailLabels).toEqual([today()]);
    component.clearKeyDetail();
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { api_key: null } }));
  });

  it('keeps the page alive without the endpoint aggregate', async () => {
    api.getApiKeyUsageByEndpoint.mockReturnValue(throwError(() => new Error('404')));
    await build();
    expect(component.endpointsUnavailable).toBe(true);
    expect(component.kpis.length).toBe(6);
  });

  it('skips the CSV export when the log is empty', async () => {
    await build();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click');
    component.exportLogsCsv();
    expect(click).not.toHaveBeenCalled();
    click.mockRestore();
  });
});
