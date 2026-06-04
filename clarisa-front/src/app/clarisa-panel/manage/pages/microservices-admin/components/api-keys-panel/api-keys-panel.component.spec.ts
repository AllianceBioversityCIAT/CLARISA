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
    getAllApiKeys: jasmine
      .createSpy('getAllApiKeys')
      .and.returnValue(of([])),
    getAllEnvironments: jasmine
      .createSpy('getAllEnvironments')
      .and.returnValue(of([])),
    getApiKeyScopes: jasmine
      .createSpy('getApiKeyScopes')
      .and.returnValue(of([])),
    getAllMis: jasmine.createSpy('getAllMis').and.returnValue(of([])),
    createApiKey: jasmine.createSpy('createApiKey'),
    revokeApiKey: jasmine.createSpy('revokeApiKey'),
    rotateApiKey: jasmine.createSpy('rotateApiKey'),
    deleteApiKey: jasmine.createSpy('deleteApiKey'),
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
    }).compileComponents();

    fixture = TestBed.createComponent(ApiKeysPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
});
