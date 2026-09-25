import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ManageApiService, UsageSummary } from '../../../../services/manage-api.service';
import { ApiKeyUsageDashboardComponent } from './api-key-usage-dashboard.component';

const emptySummary = (): UsageSummary => ({
  period: { from: '', to: '' },
  totals: {
    total_requests: 0,
    error_count: 0,
    avg_response_time_ms: null,
    active_keys: 0,
    revoked_keys: 0,
    expiring_within_30_days: 0
  },
  by_mis: [],
  by_mis_microservice: [],
  by_microservice: [],
  keys: [],
  time_series: []
});

describe('ApiKeyUsageDashboardComponent', () => {
  let component: ApiKeyUsageDashboardComponent;
  let fixture: ComponentFixture<ApiKeyUsageDashboardComponent>;
  let queryParams: BehaviorSubject<any>;

  const manageApiMock = {
    getAllMis: jest.fn().mockReturnValue(of([])),
    getApiReferenceCatalog: jest.fn().mockReturnValue(of({ groups: [] })),
    getApiKeyUsageSummary: jest.fn().mockReturnValue(of(emptySummary())),
    getApiKeyUsageByEndpoint: jest.fn().mockReturnValue(of({ period: { from: '', to: '' }, total_requests: 0, items: [] })),
    getApiKeyUsageLogs: jest.fn().mockReturnValue(of({ period: { from: '', to: '' }, total: 0, items: [] })),
    getApiKeyUsage: jest.fn().mockReturnValue(of(null))
  };
  const router = { navigate: jest.fn() };

  const build = async (params: Record<string, string> = {}) => {
    queryParams = new BehaviorSubject(convertToParamMap(params));
    await TestBed.configureTestingModule({
      declarations: [ApiKeyUsageDashboardComponent],
      imports: [FormsModule],
      providers: [
        MessageService,
        { provide: ManageApiService, useValue: manageApiMock },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams.asObservable(), snapshot: { queryParamMap: convertToParamMap(params) } } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(ApiKeyUsageDashboardComponent, {
        set: { template: '<div></div>' }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ApiKeyUsageDashboardComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    manageApiMock.getApiKeyUsageSummary.mockReturnValue(of(emptySummary()));
    manageApiMock.getApiKeyUsageByEndpoint.mockReturnValue(of({ period: { from: '', to: '' }, total_requests: 0, items: [] }));
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create and load summary, endpoints and the first page of the log', async () => {
    await build();
    expect(component).toBeTruthy();
    expect(manageApiMock.getApiKeyUsageSummary).toHaveBeenCalledTimes(1);
    expect(manageApiMock.getApiKeyUsageByEndpoint).toHaveBeenCalledTimes(1);
    expect(manageApiMock.getApiKeyUsageLogs).toHaveBeenCalledWith(expect.objectContaining({ limit: 25, offset: 0 }));
    expect(manageApiMock.getApiKeyUsage).not.toHaveBeenCalled();
  });

  it('opens on the last 30 days, daily, and switches to weekly for long ranges', async () => {
    await build();
    expect(component.rangePreset).toBe('30d');
    expect(component.granularity).toBe('day');
    const params = component.queryParams;
    const days = (new Date(params.to!).getTime() - new Date(params.from!).getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(31);

    component.setRange('12m');
    expect(component.granularity).toBe('week');
    expect(manageApiMock.getApiKeyUsageSummary).toHaveBeenCalledTimes(2);

    component.setRange('ytd');
    expect(new Date(component.queryParams.from!).getMonth()).toBe(0);
  });

  it('custom keeps the previous range as a starting point and only reloads on Apply', async () => {
    await build();
    component.setRange('custom');
    expect(component.customFrom).not.toBeNull();
    expect(component.customTo).not.toBeNull();
    expect(manageApiMock.getApiKeyUsageSummary).toHaveBeenCalledTimes(1);

    component.customFrom = new Date('2026-09-10');
    component.customTo = new Date('2026-09-01');
    component.applyCustomRange();
    expect(manageApiMock.getApiKeyUsageSummary).toHaveBeenCalledTimes(1);

    component.customTo = new Date('2026-09-20');
    component.applyCustomRange();
    expect(manageApiMock.getApiKeyUsageSummary).toHaveBeenCalledTimes(2);
  });

  it('preselects the key from ?api_key= and loads its detail', async () => {
    manageApiMock.getApiKeyUsage.mockReturnValue(
      of({ api_key: { id: 7 }, totals: { total_requests: 1, active_days: 1 }, time_series: [], by_microservice: [], top_endpoints: [] })
    );
    await build({ api_key: '7' });
    expect(component.filterApiKeyId).toBe(7);
    expect(manageApiMock.getApiKeyUsage).toHaveBeenCalledWith(7, expect.objectContaining({ api_key_id: 7 }));
    expect(manageApiMock.getApiKeyUsageSummary).toHaveBeenCalledTimes(1);

    component.clearKeyDetail();
    expect(component.filterApiKeyId).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { api_key: null } }));
  });

  it('derives systems, last activity and shares from the summary', async () => {
    const summary = emptySummary();
    summary.totals.total_requests = 200;
    summary.by_mis = [
      { mis_id: 1, mis_acronym: 'PRMS', mis_name: 'PRMS', environment: 'PROD', total_requests: 150, api_key_count: 2, microservices_used: 1 },
      { mis_id: null, mis_acronym: '—', mis_name: 'Unassigned', environment: null, total_requests: 50, api_key_count: 1, microservices_used: 1 }
    ];
    summary.keys = [
      {
        id: 1,
        name: 'Reporting Tool',
        key_prefix: 'cl_prod_a',
        mis_acronym: 'PRMS',
        mis_name: 'PRMS',
        environment: 'PROD',
        usage_count: 900,
        last_used_at: '2026-09-24T10:00:00.000Z',
        requests_in_period: 150,
        is_active: true,
        expires_at: null
      },
      {
        id: 2,
        name: 'Loose',
        key_prefix: 'cl_prod_b',
        mis_acronym: null,
        mis_name: null,
        environment: 'PROD',
        usage_count: 50,
        last_used_at: '2026-09-01T10:00:00.000Z',
        requests_in_period: 50,
        is_active: false,
        expires_at: null
      }
    ];
    manageApiMock.getApiKeyUsageSummary.mockReturnValue(of(summary));

    await build();

    expect(component.systemsCount).toBe(1);
    expect(component.unassignedRequests).toBe(50);
    expect(component.lastActivity).toEqual({ at: '2026-09-24T10:00:00.000Z', key: 'Reporting Tool' });
    expect(component.consumers[0]).toMatchObject({ mis_acronym: 'PRMS', share: 75, last_used_at: '2026-09-24T10:00:00.000Z' });
    expect(component.keyRows[1].status_label).toBe('Revoked');
    expect(component.apiKeyOptions.map(o => o.id)).toEqual([1, 2]);
  });

  it('narrows to a system on click and back off on the second click', async () => {
    await build();
    const row = {
      mis_id: 3,
      mis_acronym: 'TOC',
      mis_name: '',
      environment: null,
      total_requests: 1,
      share: 1,
      api_key_count: 1,
      microservices_used: 1,
      last_used_at: null,
      last_used_ts: 0,
      search_text: ''
    };

    component.toggleMis(row);
    expect(component.filterMisId).toBe(3);
    expect(component.queryParams.mis_id).toBe(3);

    component.toggleMis(row);
    expect(component.filterMisId).toBeNull();

    component.toggleMis({ ...row, mis_id: null });
    expect(component.filterMisId).toBeNull();
  });

  it('builds the endpoint tree from the catalogue and selects the busiest endpoint', async () => {
    manageApiMock.getApiReferenceCatalog.mockReturnValueOnce(
      of({
        groups: [
          {
            group: 'One CGIAR Control List',
            categories: [
              {
                name: 'Institutions',
                endpoints: [
                  { name: 'Institutions', route: 'api/institutions', method: 'get' },
                  { name: 'Countries', route: 'api/countries', method: 'get' }
                ]
              }
            ]
          }
        ]
      })
    );
    manageApiMock.getApiKeyUsageByEndpoint.mockReturnValue(
      of({
        period: { from: '', to: '' },
        total_requests: 12,
        items: [
          {
            microservice_name: 'clarisa-api',
            endpoint: '/api/countries',
            http_method: 'GET',
            total_requests: 2,
            error_count: 0,
            avg_response_time_ms: 10,
            unique_api_keys: 1,
            last_used_at: null,
            consumers: []
          },
          {
            microservice_name: 'clarisa-api',
            endpoint: '/api/institutions/get/1',
            http_method: 'GET',
            total_requests: 10,
            error_count: 0,
            avg_response_time_ms: 10,
            unique_api_keys: 1,
            last_used_at: null,
            consumers: []
          }
        ]
      })
    );

    await build();

    expect(component.tree).toHaveLength(1);
    expect(component.selectedEndpoint?.route).toBe('api/institutions');
    expect(component.endpointShare(component.selectedEndpoint!)).toBe(83.3);
    expect(component.isGroupOpen(component.tree[0])).toBe(true);

    component.onEndpointQuery('countr');
    expect(component.visibleTree[0].categories[0].endpoints.map(e => e.route)).toEqual(['api/countries']);
    expect(component.selectedEndpoint?.route).toBe('api/countries');

    component.onEndpointQuery('');
    expect(component.visibleTree).toBe(component.tree);
  });

  it('keeps the page alive when the endpoint aggregate is missing on the server', async () => {
    manageApiMock.getApiKeyUsageByEndpoint.mockReturnValue(throwError(() => new Error('404')));
    await build();
    expect(component.endpointsUnavailable).toBe(true);
    expect(component.summary).not.toBeNull();
  });

  it('pages the log on the server', async () => {
    await build();
    component.onLogsLazy({ first: 50, rows: 50 });
    expect(manageApiMock.getApiKeyUsageLogs).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 50, offset: 50 }));
    expect(component.logsFirst).toBe(50);

    component.onFiltersChange();
    expect(component.logsFirst).toBe(0);
  });

  it('should format metrics and compute error rate', async () => {
    await build();
    expect(component.formatNumber(null)).toBe('—');
    expect(component.formatNumber(1200)).toBe('1,200');
    expect(component.formatMs(42)).toBe('42 ms');
    expect(component.formatDate('')).toBe('—');
    expect(component.ago(null)).toBe('Never');

    component.summary = emptySummary();
    expect(component.errorRate()).toBe('0%');

    component.summary.totals.total_requests = 10;
    component.summary.totals.error_count = 2;
    expect(component.errorRate()).toBe('20.0%');
  });

  it('should skip CSV export when there are no log rows', async () => {
    await build();
    component.logs = { period: { from: '', to: '' }, total: 0, items: [] };
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click');

    component.exportLogsCsv();

    expect(clickSpy).not.toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
