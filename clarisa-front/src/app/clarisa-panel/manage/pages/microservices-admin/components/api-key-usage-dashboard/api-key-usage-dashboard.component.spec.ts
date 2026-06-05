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
    getAllMis: jasmine.createSpy('getAllMis').and.returnValue(of([])),
    getApiKeyUsageSummary: jasmine
      .createSpy('getApiKeyUsageSummary')
      .and.returnValue(
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
    getApiKeyUsageLogs: jasmine
      .createSpy('getApiKeyUsageLogs')
      .and.returnValue(of({ period: { from: '', to: '' }, total: 0, items: [] })),
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
    }).compileComponents();

    fixture = TestBed.createComponent(ApiKeyUsageDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load summary', () => {
    expect(component).toBeTruthy();
    expect(manageApiMock.getApiKeyUsageSummary).toHaveBeenCalled();
  });
});
