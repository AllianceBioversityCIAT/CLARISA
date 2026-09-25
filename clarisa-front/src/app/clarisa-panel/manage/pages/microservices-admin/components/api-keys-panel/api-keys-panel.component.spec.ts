import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { ManageApiService } from '../../../../services/manage-api.service';
import { ApiKeysPanelComponent } from './api-keys-panel.component';

describe('ApiKeysPanelComponent', () => {
  let component: ApiKeysPanelComponent;
  let fixture: ComponentFixture<ApiKeysPanelComponent>;

  const manageApiMock = {
    getAllApiKeys: jest.fn().mockReturnValue(of([])),
    getAllEnvironments: jest.fn().mockReturnValue(of([])),
    getApiKeyScopes: jest.fn().mockReturnValue(of([])),
    getAllMis: jest.fn().mockReturnValue(of([])),
    getApiKeyUsage: jest.fn(),
    createApiKey: jest.fn(),
    updateApiKey: jest.fn(),
    revokeApiKey: jest.fn(),
    rotateApiKey: jest.fn(),
    deleteApiKey: jest.fn()
  };
  const router = { navigate: jest.fn() };

  const key = (over: Partial<any> = {}) => ({
    id: 7,
    name: 'Reporting Tool',
    description: 'PRMS back end',
    key_prefix: 'cl_prod_abc',
    mis_id: 3,
    mis_acronym: 'PRMS',
    environment: 'PROD',
    scopes: ['institutions:read'],
    allowed_ips: ['10.0.0.1'],
    usage_count: 12,
    is_active: true,
    expires_at: '2030-01-01T00:00:00.000Z',
    last_used_at: null,
    ...over
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await TestBed.configureTestingModule({
      declarations: [ApiKeysPanelComponent],
      imports: [ReactiveFormsModule],
      providers: [{ provide: ManageApiService, useValue: manageApiMock }, { provide: Router, useValue: router }, MessageService, ConfirmationService],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(ApiKeysPanelComponent, {
        set: { template: '<div></div>' }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ApiKeysPanelComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load keys, environments and scopes on init', () => {
    expect(manageApiMock.getAllApiKeys).toHaveBeenCalledWith('active');
    expect(manageApiMock.getAllEnvironments).toHaveBeenCalled();
    expect(manageApiMock.getApiKeyScopes).toHaveBeenCalled();
    expect(manageApiMock.getAllMis).toHaveBeenCalled();
  });

  it('should build key prefix preview from environment acronym', () => {
    expect(component.keyPrefixPreview('PROD')).toBe('cl_prod_');
    expect(component.keyPrefixPreview(null)).toBe('cl_{env}_');
  });

  it('should resolve key status labels and severities', () => {
    const active = {
      id: 1,
      name: 'Active',
      key_prefix: 'cl_dev_',
      usage_count: 1,
      is_active: true
    };
    const revoked = { ...active, is_active: false };
    const expired = {
      ...active,
      expires_at: '2000-01-01T00:00:00.000Z'
    };

    expect(component.statusLabel(active)).toBe('Active');
    expect(component.statusSeverity(active)).toBe('success');
    expect(component.statusLabel(revoked)).toBe('Revoked');
    expect(component.statusSeverity(revoked)).toBe('danger');
    expect(component.statusLabel(expired)).toBe('Expired');
    expect(component.statusSeverity(expired)).toBe('warning');
  });

  it('should patch environment when a linked MIS is selected', () => {
    component.mises = [{ id: 5, acronym: 'EMAIL', name: 'Email MS', environment: 'PROD' }];

    component.onMisSelected(null);
    component.onMisSelected(5);

    expect(component.form.get('environment')?.value).toBe('PROD');
  });

  it('decorates rows with a sortable status, last-used epoch and a search line', () => {
    manageApiMock.getAllApiKeys.mockReturnValueOnce(of([key({ last_used_at: '2026-09-24T10:00:00.000Z' })]));

    component.loadKeys();

    const row = component.keys[0];
    expect(row.status_label).toBe('Active');
    expect(row.last_used_ts).toBe(new Date('2026-09-24T10:00:00.000Z').getTime());
    expect(row.search_text).toContain('prms back end');
    expect(row.search_text).toContain('cl_prod_abc');
  });

  it('creates with the description and without the empty optionals', () => {
    manageApiMock.createApiKey.mockReturnValue(of({ response: { key: 'cl_prod_secret' } }));
    component.openCreate();
    component.form.patchValue({ name: ' Reports ', description: ' Held by PRMS ', environment: 'PROD' });

    component.submit();

    expect(manageApiMock.createApiKey).toHaveBeenCalledWith({ name: 'Reports', environment: 'PROD', description: 'Held by PRMS' });
    expect(component.secretVisible).toBe(true);
    expect(component.createdSecret).toBe('cl_prod_secret');
  });

  it('edits with every field present, cleared ones as null, and the environment locked', () => {
    manageApiMock.updateApiKey.mockReturnValue(of({}));
    component.openEdit(key());

    expect(component.editing?.id).toBe(7);
    expect(component.form.get('environment')?.disabled).toBe(true);
    expect(component.form.get('description')?.value).toBe('PRMS back end');
    expect(component.form.get('allowedIpsText')?.value).toBe('10.0.0.1');

    component.form.patchValue({ description: '', mis_id: null, allowedIpsText: '', expires_at: null, scopes: [] });
    component.submit();

    expect(manageApiMock.updateApiKey).toHaveBeenCalledWith(7, {
      name: 'Reporting Tool',
      description: '',
      mis_id: null,
      scopes: [],
      allowed_ips: [],
      expires_at: null
    });
    expect(component.dialogVisible).toBe(false);
    expect(component.editing).toBeNull();
    // Editing never opens the secret dialog: the secret did not change.
    expect(component.secretVisible).toBe(false);
  });

  it('does not let a MIS pick overwrite the environment while editing', () => {
    component.mises = [{ id: 5, acronym: 'EMAIL', name: 'Email MS', environment: 'TEST' }];
    component.openEdit(key({ environment: 'PROD' }));

    component.onMisSelected(5);

    expect(component.form.getRawValue().environment).toBe('PROD');
  });

  it('loads the 30-day usage once when a row expands, and keeps the row open if it fails', () => {
    manageApiMock.getApiKeyUsage.mockReturnValueOnce(of({ totals: { total_requests: 3 }, top_endpoints: [], by_microservice: [] }));
    const row = key();

    component.onRowExpand({ data: row });
    component.onRowExpand({ data: row });

    expect(manageApiMock.getApiKeyUsage).toHaveBeenCalledTimes(1);
    expect(manageApiMock.getApiKeyUsage.mock.calls[0][0]).toBe(7);
    expect(component.detailById[7]?.totals.total_requests).toBe(3);

    manageApiMock.getApiKeyUsage.mockReturnValueOnce(throwError(() => new Error('404')));
    component.onRowExpand({ data: key({ id: 8 }) });
    expect(component.detailById[8]).toBeNull();
    expect(component.detailLoading[8]).toBe(false);
  });

  it('opens the Overview with the key preselected', () => {
    component.openInOverview(key());
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { section: 'overview', api_key: 7 } }));
  });

  it('should not copy an empty secret', () => {
    const writeText = jest.fn();
    Object.assign(navigator, {
      clipboard: { writeText }
    });
    component.createdSecret = '';

    component.copySecret();

    expect(writeText).not.toHaveBeenCalled();
  });
});
