import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { ManageApiService } from '../../../../services/manage-api.service';
import { MisesPanelComponent } from './mises-panel.component';

describe('MisesPanelComponent', () => {
  let component: MisesPanelComponent;
  let fixture: ComponentFixture<MisesPanelComponent>;
  let confirm: ConfirmationService;

  const manageApiMock = {
    getAllMis: jest.fn().mockReturnValue(of([])),
    getAllUser: jest.fn().mockReturnValue(of([])),
    getAllEnvironments: jest.fn().mockReturnValue(of([])),
    getMisActivity: jest.fn().mockReturnValue(of([])),
    createMis: jest.fn(),
    deactivateMis: jest.fn(),
    activateMis: jest.fn()
  };

  const mis = (over: Partial<any> = {}) => ({
    id: 5,
    name: 'Monitoring, Evaluation and Learning',
    acronym: 'MEL',
    environment_object: { acronym: 'TEST', name: 'Testing' },
    is_active: true,
    ...over
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    manageApiMock.getAllMis.mockReturnValue(of([]));
    manageApiMock.getMisActivity.mockReturnValue(of([]));
    await TestBed.configureTestingModule({
      declarations: [MisesPanelComponent],
      imports: [ReactiveFormsModule],
      providers: [{ provide: ManageApiService, useValue: manageApiMock }, MessageService, ConfirmationService],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(MisesPanelComponent, {
        set: { template: '<div></div>' }
      })
      .compileComponents();

    fixture = TestBed.createComponent(MisesPanelComponent);
    component = fixture.componentInstance;
    confirm = TestBed.inject(ConfirmationService);
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load mises, users, environments and activity on init', () => {
    expect(manageApiMock.getAllMis).toHaveBeenCalled();
    expect(manageApiMock.getAllUser).toHaveBeenCalled();
    expect(manageApiMock.getAllEnvironments).toHaveBeenCalled();
    expect(manageApiMock.getMisActivity).toHaveBeenCalled();
  });

  it('should normalize MIS environment from environment_object', () => {
    const row = (component as any).normalizeMis({
      id: 1,
      name: 'Test MIS',
      acronym: 'TST',
      environment_object: { acronym: 'DEV', name: 'Development' }
    });
    expect(row.environment).toBe('DEV');
    expect(row.environmentName).toBe('Development');
  });

  it('should normalize users and environments', () => {
    const user = (component as any).normalizeUser({
      id: 3,
      email: 'user@test.com',
      first_name: 'Ada',
      last_name: 'Lovelace'
    });
    const env = (component as any).normalizeEnvironment({
      acronym: 'PROD',
      name: 'Production'
    });

    expect(user.displayName).toBe('Ada Lovelace');
    expect(env.label).toBe('PROD — Production');
  });

  it('should default contact point from localStorage when opening create', () => {
    localStorage.setItem('user', JSON.stringify({ id: 9 }));

    component.openCreate();

    expect(component.createVisible).toBe(true);
    expect(component.form.get('contact_point_id')?.value).toBe(9);
    localStorage.clear();
  });

  it('merges keys held and last use into each row, whichever call lands last', () => {
    manageApiMock.getAllMis.mockReturnValueOnce(of([mis(), mis({ id: 6, acronym: 'TOC' })]));
    manageApiMock.getMisActivity.mockReturnValueOnce(
      of([{ mis_id: 5, mis_acronym: 'MEL', mis_name: '', total_keys: 3, active_keys: 2, usage_count: 40, last_used_at: '2026-09-24T10:00:00.000Z' }])
    );

    component.loadMises();
    component.loadActivity();

    const [mel, toc] = component.mises;
    expect(component.keysLabel(mel)).toBe('2 of 3');
    expect(component.lastUsed(mel)).not.toBe('Never');
    expect(mel.lastUsedTs).toBeGreaterThan(0);
    expect(component.keysLabel(toc)).toBe('None');
    expect(component.lastUsed(toc)).toBe('Never');
  });

  it('says the two columns are unavailable instead of showing zeros when the aggregate is missing', () => {
    manageApiMock.getAllMis.mockReturnValueOnce(of([mis()]));
    manageApiMock.getMisActivity.mockReturnValueOnce(throwError(() => new Error('404')));

    component.loadMises();
    component.loadActivity();

    expect(component.activityUnavailable).toBe(true);
    expect(component.keysLabel(component.mises[0])).toBe('—');
    expect(component.lastUsed(component.mises[0])).toBe('—');
  });

  it('deactivates after confirmation, naming the active keys still linked', () => {
    manageApiMock.deactivateMis.mockReturnValue(of({}));
    const confirmSpy = jest.spyOn(confirm, 'confirm').mockImplementation((options: any) => {
      options.accept();
      return confirm;
    });

    component.confirmDeactivate({ id: 5, name: 'MEL', acronym: 'MEL', environment: 'TEST', activeKeys: 2, totalKeys: 3 });

    expect(confirmSpy.mock.calls[0][0].message).toContain('2 active keys are linked');
    expect(manageApiMock.deactivateMis).toHaveBeenCalledWith(5);
    expect(manageApiMock.getAllMis).toHaveBeenCalledTimes(2);
  });

  it('reactivates after confirmation', () => {
    manageApiMock.activateMis.mockReturnValue(of({}));
    jest.spyOn(confirm, 'confirm').mockImplementation((options: any) => {
      options.accept();
      return confirm;
    });

    component.confirmActivate({ id: 5, name: 'MEL', acronym: 'MEL', is_active: false });

    expect(manageApiMock.activateMis).toHaveBeenCalledWith(5);
  });
});
