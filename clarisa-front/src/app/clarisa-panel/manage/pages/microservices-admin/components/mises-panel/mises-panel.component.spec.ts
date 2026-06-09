import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { ManageApiService } from '../../../../services/manage-api.service';
import { MisesPanelComponent } from './mises-panel.component';

describe('MisesPanelComponent', () => {
  let component: MisesPanelComponent;
  let fixture: ComponentFixture<MisesPanelComponent>;

  const manageApiMock = {
    getAllMis: jest.fn().mockReturnValue(of([])),
    getAllUser: jest.fn().mockReturnValue(of([])),
    getAllEnvironments: jest.fn().mockReturnValue(of([])),
    createMis: jest.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MisesPanelComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: ManageApiService, useValue: manageApiMock },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(MisesPanelComponent, {
        set: { template: '<div></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MisesPanelComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load mises, users and environments on init', () => {
    expect(manageApiMock.getAllMis).toHaveBeenCalled();
    expect(manageApiMock.getAllUser).toHaveBeenCalled();
    expect(manageApiMock.getAllEnvironments).toHaveBeenCalled();
  });

  it('should normalize MIS environment from environment_object', () => {
    const row = (component as any).normalizeMis({
      id: 1,
      name: 'Test MIS',
      acronym: 'TST',
      environment_object: { acronym: 'DEV', name: 'Development' },
    });
    expect(row.environment).toBe('DEV');
    expect(row.environmentName).toBe('Development');
  });

  it('should normalize users and environments', () => {
    const user = (component as any).normalizeUser({
      id: 3,
      email: 'user@test.com',
      first_name: 'Ada',
      last_name: 'Lovelace',
    });
    const env = (component as any).normalizeEnvironment({
      acronym: 'PROD',
      name: 'Production',
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
});
