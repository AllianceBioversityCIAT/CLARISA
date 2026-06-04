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
    getAllMis: jasmine.createSpy('getAllMis').and.returnValue(of([])),
    getAllUser: jasmine.createSpy('getAllUser').and.returnValue(of([])),
    getAllEnvironments: jasmine
      .createSpy('getAllEnvironments')
      .and.returnValue(of([])),
    createMis: jasmine.createSpy('createMis'),
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
    }).compileComponents();

    fixture = TestBed.createComponent(MisesPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
});
