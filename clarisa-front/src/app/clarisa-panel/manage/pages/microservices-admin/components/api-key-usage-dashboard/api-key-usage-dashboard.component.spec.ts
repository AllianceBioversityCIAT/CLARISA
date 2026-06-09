import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ApiKeyUsageDashboardComponent } from './api-key-usage-dashboard.component';
import { ManageApiService } from '../../../../services/manage-api.service';
import { of } from 'rxjs';

describe('ApiKeyUsageDashboardComponent', () => {
  let component: ApiKeyUsageDashboardComponent;
  let fixture: ComponentFixture<ApiKeyUsageDashboardComponent>;

  const manageApiMock = {
    getAllMis: jest.fn().mockReturnValue(of([])),
    getApiKeyUsageSummary: jest.fn().mockReturnValue(
      of({
        period: { from: '', to: '' },
        totals: {
          total_requests: 0,
          error_count: 0,
          avg_response_time_ms: null,
          active_keys: 0,
          revoked_keys: 0,
          expiring_within_30_days: 0,
        },
        by_mis: [],
        by_mis_microservice: [],
        by_microservice: [],
        keys: [],
        time_series: [],
      }),
    ),
    getApiKeyUsageLogs: jest
      .fn()
      .mockReturnValue(of({ period: { from: '', to: '' }, total: 0, items: [] })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ApiKeyUsageDashboardComponent],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [
        MessageService,
        { provide: ManageApiService, useValue: manageApiMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ApiKeyUsageDashboardComponent, {
        set: { template: '<div></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ApiKeyUsageDashboardComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('should create and load summary', () => {
    expect(component).toBeTruthy();
    expect(manageApiMock.getApiKeyUsageSummary).toHaveBeenCalled();
  });

  it('should format metrics and compute error rate', () => {
    expect(component.formatNumber(null)).toBe('—');
    expect(component.formatNumber(1200)).toBe('1,200');
    expect(component.formatMs(42)).toBe('42 ms');
    expect(component.formatDate('')).toBe('—');

    component.summary = {
      period: { from: '', to: '' },
      totals: {
        total_requests: 0,
        error_count: 0,
        avg_response_time_ms: null,
        active_keys: 0,
        revoked_keys: 0,
        expiring_within_30_days: 0,
      },
      by_mis: [],
      by_mis_microservice: [],
      by_microservice: [],
      keys: [],
      time_series: [],
    };
    expect(component.errorRate()).toBe('0%');

    component.summary.totals.total_requests = 10;
    component.summary.totals.error_count = 2;
    expect(component.errorRate()).toBe('20.0%');
  });

  it('should skip CSV export when there are no log rows', () => {
    component.logs = { period: { from: '', to: '' }, total: 0, items: [] };
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click');

    component.exportLogsCsv();

    expect(clickSpy).not.toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
