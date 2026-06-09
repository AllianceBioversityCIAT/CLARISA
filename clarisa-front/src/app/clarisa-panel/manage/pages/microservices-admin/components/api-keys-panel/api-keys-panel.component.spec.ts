import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';
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
    createApiKey: jest.fn(),
    revokeApiKey: jest.fn(),
    rotateApiKey: jest.fn(),
    deleteApiKey: jest.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ApiKeysPanelComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: ManageApiService, useValue: manageApiMock },
        MessageService,
        ConfirmationService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ApiKeysPanelComponent, {
        set: { template: '<div></div>' },
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
      is_active: true,
    };
    const revoked = { ...active, is_active: false };
    const expired = {
      ...active,
      expires_at: '2000-01-01T00:00:00.000Z',
    };

    expect(component.statusLabel(active)).toBe('Active');
    expect(component.statusSeverity(active)).toBe('success');
    expect(component.statusLabel(revoked)).toBe('Revoked');
    expect(component.statusSeverity(revoked)).toBe('danger');
    expect(component.statusLabel(expired)).toBe('Expired');
    expect(component.statusSeverity(expired)).toBe('warning');
  });

  it('should patch environment when a linked MIS is selected', () => {
    component.mises = [
      { id: 5, acronym: 'EMAIL', name: 'Email MS', environment: 'PROD' },
    ];

    component.onMisSelected(null);
    component.onMisSelected(5);

    expect(component.form.get('environment')?.value).toBe('PROD');
  });

  it('should not copy an empty secret', () => {
    const writeText = jest.fn();
    Object.assign(navigator, {
      clipboard: { writeText },
    });
    component.createdSecret = '';

    component.copySecret();

    expect(writeText).not.toHaveBeenCalled();
  });
});
