import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
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

  it('should hand the dropdown a stable array reference', () => {
    // Regression. This used to be a getter bound to `[options]`, so Angular
    // re-evaluated it on every change detection cycle and handed PrimeNG a
    // brand new array each time. With close to ten thousand institutions in
    // the catalogue, the changed reference made the dropdown re-render, which
    // scheduled another cycle: the options never painted and the tab froze.
    component.openEdit(component.institutions[0]);

    const first = component.availableSuccessors;
    const second = component.availableSuccessors;

    expect(second).toBe(first);
  });

  it('should refresh the candidates when the edited row changes', () => {
    // The flip side of the field: it has to be recomputed whenever one of its
    // two inputs moves, or the dialog would offer the previous row's list.
    component.openEdit(component.institutions[0]);
    expect(component.availableSuccessors.map((option) => option.id)).toEqual([2]);

    component.openEdit(component.institutions[1]);
    expect(component.availableSuccessors.map((option) => option.id)).not.toContain(2);
  });

  it('should not offer a retired institution as a successor', () => {
    // The API rejects it with "is itself retired", so offering it could only
    // end in a failed save.
    component.openEdit(component.institutions[1]);
    expect(component.availableSuccessors).toEqual([]);
  });

  it('should keep the recorded successor listed even after it is retired', () => {
    component.institutions[1].validityStatus = 'ended';
    component.successorOptions = component.successorOptions.map((option) =>
      option.id === 2 ? { ...option, selectable: false } : option
    );

    component.openEdit(component.institutions[0]);

    expect(component.availableSuccessors.map((option) => option.id)).toEqual([2]);
  });

  it('should reload when the saved row no longer matches the status filter', () => {
    component.statusFilter = 'active';
    serviceMock.getInstitutions.mockClear();
    serviceMock.updateLifecycle.mockReturnValueOnce(
      of({ code: 2, name: 'New Institution', endDate: '2026-01-31', validityStatus: 'ended' })
    );

    component.openEdit(component.institutions[1]);
    component.form.patchValue({ endDate: new Date(2026, 0, 31) });
    component.submit();

    expect(serviceMock.getInstitutions).toHaveBeenCalledWith('active');
  });

  it('should drop an institution from the successor list once it is retired', () => {
    serviceMock.updateLifecycle.mockReturnValueOnce(
      of({ code: 2, name: 'New Institution', endDate: '2026-01-31', validityStatus: 'ended' })
    );

    component.openEdit(component.institutions[1]);
    component.form.patchValue({ endDate: new Date(2026, 0, 31) });
    component.submit();

    expect(
      component.successorOptions.find((option) => option.id === 2)?.selectable
    ).toBe(false);
  });

  it('should prefill the form from the current lineage', () => {
    component.openEdit(component.institutions[0]);
    expect(component.editVisible).toBe(true);
    expect(component.form.get('replacedByInstitutionId')?.value).toBe(2);
    expect(component.form.get('relationType')?.value).toBe('NEW');
  });

  it('should send local ISO dates and lineage on submit', () => {
    component.openEdit(component.institutions[1]);
    component.form.patchValue({
      endDate: new Date(2025, 11, 31),
      replacedByInstitutionId: 1,
      relationType: 'MERGE',
      note: '  merged into OLD  ',
    });

    component.submit();

    expect(serviceMock.updateLifecycle).toHaveBeenCalledWith(2, {
      startDate: null,
      endDate: '2025-12-31',
      replacedByInstitutionId: 1,
      relationType: 'MERGE',
      changeDate: '2025-12-31',
      note: 'merged into OLD',
    });
  });

  it('should resend the recorded succession so its relation type can be corrected', () => {
    component.openEdit(component.institutions[0]);
    component.form.patchValue({ relationType: 'SUCCESSOR' });

    component.submit();

    expect(serviceMock.updateLifecycle).toHaveBeenCalledWith(1, {
      startDate: null,
      endDate: '2025-12-31',
      replacedByInstitutionId: 2,
      relationType: 'SUCCESSOR',
      changeDate: '2025-12-31',
    });
  });

  it('should send an explicit null when the recorded successor is cleared', () => {
    // Omitting the key leaves the edge in place, so the panel would show a
    // success toast and re-render the very successor it was asked to remove.
    component.openEdit(component.institutions[0]);
    component.form.patchValue({ replacedByInstitutionId: null });

    component.submit();

    expect(serviceMock.updateLifecycle).toHaveBeenCalledWith(1, {
      startDate: null,
      endDate: '2025-12-31',
      replacedByInstitutionId: null,
    });
  });

  it('should refuse to swap the recorded successor in a single step', () => {
    component.openEdit(component.institutions[0]);
    component.form.patchValue({ replacedByInstitutionId: 3 });

    component.submit();

    expect(serviceMock.updateLifecycle).not.toHaveBeenCalled();
  });

  it('should not send a removal for a row that never had a successor', () => {
    component.openEdit(component.institutions[1]);

    component.submit();

    expect(serviceMock.updateLifecycle).toHaveBeenCalledWith(2, {
      startDate: null,
      endDate: null,
    });
  });

  it('should surface the per-field validation messages of the API', () => {
    const messageService = TestBed.inject(MessageService);
    const spy = jest.spyOn(messageService, 'add');
    serviceMock.updateLifecycle.mockReturnValueOnce(
      throwError(() => ({
        error: {
          response: { message: ['endDate must be a calendar date (yyyy-MM-dd)'] },
          message: 'Bad Request Exception',
        },
      }))
    );

    component.openEdit(component.institutions[1]);
    component.submit();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'endDate must be a calendar date (yyyy-MM-dd)',
      })
    );
    spy.mockRestore();
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

  it('should refuse to send a successor without an end date', () => {
    // The API rejects that combination: an institution that is still valid and
    // already declares who replaces it leaves consumers without a rule.
    component.openEdit(component.institutions[1]);
    component.form.patchValue({ endDate: null, replacedByInstitutionId: 1 });

    component.submit();

    expect(serviceMock.updateLifecycle).not.toHaveBeenCalled();
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
