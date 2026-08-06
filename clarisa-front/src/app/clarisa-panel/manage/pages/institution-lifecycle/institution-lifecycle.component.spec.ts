import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { InstitutionLifecycleService } from '../../services/institution-lifecycle.service';
import { InstitutionLifecycleComponent } from './institution-lifecycle.component';

describe('InstitutionLifecycleComponent', () => {
  let component: InstitutionLifecycleComponent;
  let fixture: ComponentFixture<InstitutionLifecycleComponent>;

  const institutions = [
    {
      code: 1,
      name: 'Old Institution',
      acronym: 'OLD',
      institutionType: { name: 'NGO' },
      endDate: '2025-12-31',
      validityStatus: 'ended' as const,
      replacedBy: [
        {
          code: 2,
          name: 'New Institution',
          acronym: 'NEW',
          relationType: 'NEW' as const,
          changeDate: '2025-12-31',
        },
      ],
      previousAcronyms: ['OLDER'],
    },
    {
      code: 2,
      name: 'New Institution',
      acronym: 'NEW',
      institutionType: { name: 'NGO' },
      endDate: null,
      validityStatus: 'active' as const,
    },
  ];

  const serviceMock = {
    getInstitutions: jest.fn().mockReturnValue(of(institutions)),
    updateLifecycle: jest.fn().mockReturnValue(of({ code: 1, name: 'Old Institution' })),
  };

  beforeEach(async () => {
    serviceMock.getInstitutions.mockClear();
    serviceMock.updateLifecycle.mockClear();

    await TestBed.configureTestingModule({
      declarations: [InstitutionLifecycleComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: InstitutionLifecycleService, useValue: serviceMock },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(InstitutionLifecycleComponent, {
        set: { template: '<div></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(InstitutionLifecycleComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load institutions and seed successor options on init', () => {
    expect(serviceMock.getInstitutions).toHaveBeenCalledWith('all');
    expect(component.institutions.length).toBe(2);
    expect(component.successorOptions.length).toBe(2);
    expect(component.institutions[0].validityStatus).toBe('ended');
  });

  it('should exclude the selected institution from successor options', () => {
    component.openEdit(component.institutions[0]);
    expect(component.availableSuccessors.map((option) => option.id)).toEqual([2]);
  });

  it('should prefill the form from the current lineage', () => {
    component.openEdit(component.institutions[0]);
    expect(component.editVisible).toBe(true);
    expect(component.form.get('replacedByInstitutionId')?.value).toBe(2);
    expect(component.form.get('relationType')?.value).toBe('NEW');
  });

  it('should send local ISO dates and lineage on submit', () => {
    component.openEdit(component.institutions[0]);
    component.form.patchValue({
      endDate: new Date(2025, 11, 31),
      replacedByInstitutionId: 2,
      relationType: 'MERGE',
      note: '  merged into NEW  ',
    });

    component.submit();

    expect(serviceMock.updateLifecycle).toHaveBeenCalledWith(1, {
      startDate: null,
      endDate: '2025-12-31',
      replacedByInstitutionId: 2,
      relationType: 'MERGE',
      changeDate: '2025-12-31',
      note: 'merged into NEW',
    });
  });

  it('should omit lineage fields when no successor is chosen', () => {
    component.openEdit(component.institutions[1]);
    component.form.patchValue({ endDate: null, replacedByInstitutionId: null });

    component.submit();

    expect(serviceMock.updateLifecycle).toHaveBeenCalledWith(2, {
      startDate: null,
      endDate: null,
    });
  });

  it('should render a readable lineage label', () => {
    expect(component.lineageLabel(component.institutions[0].replacedBy)).toBe('NEW (NEW)');
    expect(component.lineageLabel([])).toBe('');
  });

  it('should reload with the selected status filter', () => {
    component.statusFilter = 'ended';
    component.onStatusFilterChange();
    expect(serviceMock.getInstitutions).toHaveBeenLastCalledWith('ended');
  });
});
