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
          direction: 'successor' as const,
          predecessorCode: 1,
          successorCode: 2,
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
      // The other end of the very same relation, as the API publishes it on the
      // successor: same absolute codes, opposite direction.
      replaces: [
        {
          code: 1,
          name: 'Old Institution',
          acronym: 'OLD',
          direction: 'predecessor' as const,
          predecessorCode: 1,
          successorCode: 2,
          relationType: 'NEW' as const,
          changeDate: '2025-12-31',
        },
      ],
    },
  ];

  /**
   * The relation Santi reported: SMO (221) is replaced by System Office
   * (10961), recorded as SUCCESSOR. Both entries describe the same edge, one as
   * each record publishes it.
   */
  const edge = {
    predecessorCode: 221,
    successorCode: 10961,
    relationType: 'SUCCESSOR' as const,
    changeDate: '2026-08-15',
  };
  const seenFromSmo = {
    code: 10961,
    name: 'System Office',
    acronym: 'SO',
    direction: 'successor' as const,
    ...edge,
  };
  const seenFromSo = {
    code: 221,
    name: 'System Management Office',
    acronym: 'SMO',
    direction: 'predecessor' as const,
    ...edge,
  };

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

  /** Local yyyy-MM-dd of a Date, the same way the component serializes one. */
  const asIsoDay = (value: Date | null | undefined) =>
    value
      ? `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, '0')}-${`${value.getDate()}`.padStart(2, '0')}`
      : null;

  /** Today, the day the change is being recorded. */
  const today = () => asIsoDay(new Date());

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
      endDate: '2025-12-31',
      replacedByInstitutionId: 1,
      relationType: 'MERGE',
      // The day the succession is being recorded, not the day the institution
      // stops being valid: they are different facts and only coincided by
      // accident while the field defaulted to the end date.
      changeDate: today(),
      note: 'merged into OLD',
    });
  });

  it('should never send startDate, so an untouched validity start is not erased', () => {
    // The form no longer shows the field; sending its null would blank the
    // stored value on every save, because the API writes any key it receives.
    component.openEdit(component.institutions[0]);
    component.submit();

    const payload = serviceMock.updateLifecycle.mock.calls[0][1];
    expect('startDate' in payload).toBe(false);
    expect(component.form.get('startDate')).toBeNull();
  });

  it('should offer today as the change date of a succession being recorded now', () => {
    component.openEdit(component.institutions[1]);

    expect(asIsoDay(component.form.get('changeDate')?.value)).toBe(today());
  });

  it('should keep the change date already recorded instead of overwriting it with today', () => {
    component.openEdit(component.institutions[0]);

    expect(asIsoDay(component.form.get('changeDate')?.value)).toBe('2025-12-31');
  });

  it('should only ask for the lineage fields once a successor is picked', () => {
    component.openEdit(component.institutions[1]);
    expect(component.hasSuccessor).toBe(false);
    expect(component.endDateRequired).toBe(false);

    component.form.patchValue({ replacedByInstitutionId: 1 });

    expect(component.hasSuccessor).toBe(true);
    expect(component.endDateRequired).toBe(true);
  });

  it('should not block the form on the relation type', () => {
    // It describes the succession edge, the API never demands it and the
    // dropdown cannot be emptied: requiring it was dead validation.
    component.openEdit(component.institutions[1]);
    component.form.patchValue({ relationType: null });

    expect(component.form.valid).toBe(true);
  });

  it('should resend the recorded succession so its relation type can be corrected', () => {
    component.openEdit(component.institutions[0]);
    component.form.patchValue({ relationType: 'SUCCESSOR' });

    component.submit();

    expect(serviceMock.updateLifecycle).toHaveBeenCalledWith(1, {
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
    expect(component.lineageLabel(component.institutions[0].replacedBy, 'successor')).toBe('Succeeded by NEW — renamed');
    expect(component.lineageLabel(component.institutions[1].replaces, 'predecessor')).toBe('Succeeds OLD — renamed');
    expect(component.lineageLabel([], 'successor')).toBe('');
  });

  it('should never label both ends of a relation the same way', () => {
    // The reported bug: the cell printed the relation type in parentheses, so
    // `SMO (SUCCESSOR)` showed up on the predecessor row and on the successor
    // row alike and the table never said which one came first.
    const fromSmo = component.lineageLabel([seenFromSmo], 'successor');
    const fromSo = component.lineageLabel([seenFromSo], 'predecessor');

    expect(fromSmo).not.toBe(fromSo);
    expect(fromSmo).not.toContain('SUCCESSOR');
    expect(fromSo).not.toContain('SUCCESSOR');
  });

  it('should name the counterpart with the verb of its role', () => {
    expect(component.lineageLabel([seenFromSmo], 'successor')).toBe('Succeeded by SO — taken over');
    expect(component.lineageLabel([seenFromSo], 'predecessor')).toBe('Succeeds SMO — taken over');
  });

  it('should trust the absolute codes over the array the entry came from', () => {
    // A column bound to the wrong array cannot flip the lineage: the entry
    // names both ends of the relation, so its own role is not a guess.
    expect(component.lineageLabel([seenFromSo], 'successor')).toBe('Succeeds SMO — taken over');
    expect(component.lineageLabel([seenFromSmo], 'predecessor')).toBe('Succeeded by SO — taken over');
  });

  it('should fall back to direction when the absolute codes are missing', () => {
    const { predecessorCode, successorCode, ...withoutCodes } = seenFromSo;

    expect(component.lineageLabel([withoutCodes], 'successor')).toBe('Succeeds SMO — taken over');
  });

  it('should still read as a sentence when the API publishes none of the new fields', () => {
    // Shape of production today: no direction, no absolute codes. The role then
    // comes from the array, which is the only thing left to go on.
    const legacy = { code: 10961, name: 'System Office', acronym: 'SO' };

    expect(component.lineageLabel([legacy], 'successor')).toBe('Succeeded by SO');
    expect(component.lineageLabel([{ code: 10961, name: '' }], 'predecessor')).toBe('Succeeds #10961');
    expect(component.lineageTooltip([legacy])).toBe('');
  });

  it('should spell out every relation type as what happened', () => {
    const label = (relationType?: 'NEW' | 'SUCCESSOR' | 'MERGE' | 'SPLIT') =>
      component.lineageLabel([{ ...seenFromSmo, relationType }], 'successor');

    expect(label('NEW')).toBe('Succeeded by SO — renamed');
    expect(label('SUCCESSOR')).toBe('Succeeded by SO — taken over');
    expect(label('MERGE')).toBe('Succeeded by SO — merged');
    expect(label('SPLIT')).toBe('Succeeded by SO — split');
    expect(label(undefined)).toBe('Succeeded by SO');
  });

  it('should describe the relation identically on both of its ends', () => {
    // Built from the absolute ids alone, so the two rows quote the same
    // relation. Tooltips that stop matching are two different relations.
    expect(component.lineageTooltip([seenFromSmo])).toBe('221 → 10961 · taken over on 2026-08-15');
    expect(component.lineageTooltip([seenFromSo])).toBe(component.lineageTooltip([seenFromSmo]));
  });

  it('should describe every edge the cell lists, not just the first', () => {
    // A tooltip built from links[0] asserted one relation while the cell
    // enumerated all of them. MERGE and SPLIT — both offered by the dialog —
    // are exactly the shapes that produce more than one edge.
    const split = [
      seenFromSmo,
      {
        code: 10962,
        name: 'Second Office',
        acronym: 'SEC',
        direction: 'successor' as const,
        predecessorCode: 221,
        successorCode: 10962,
        relationType: 'SPLIT' as const,
        changeDate: '2026-08-15',
      },
    ];

    expect(component.lineageTooltip(split)).toBe(
      '221 → 10961 · taken over on 2026-08-15; 221 → 10962 · split on 2026-08-15',
    );
    // Both ends named in the cell are named in the tooltip too.
    expect(component.lineageLabel(split, 'successor')).toBe(
      'Succeeded by SO — taken over, Succeeded by SEC — split',
    );
    expect(component.lineageTooltip([])).toBe('');
  });

  /**
   * The three shapes the API can have while this panel is deployed, read as the
   * two cells of the reported case: "Replaced by" on the SMO row (221) and
   * "Replaces" on the System Office row (10961). In none of them may the same
   * role land on both ends — that was the bug Santi reported.
   */
  describe('lineage cell across the deploy window', () => {
    const cells = (replacedByEntry: any, replacesEntry: any) => ({
      // 221, "Replaced by": the array holds successors.
      replacedBy: component.lineageLabel([replacedByEntry], 'successor'),
      // 10961, "Replaces": the array holds predecessors.
      replaces: component.lineageLabel([replacesEntry], 'predecessor'),
    });

    it('reads the absolute codes when the API publishes them', () => {
      const { replacedBy, replaces } = cells(seenFromSmo, seenFromSo);

      expect(replacedBy).toBe('Succeeded by SO — taken over');
      expect(replaces).toBe('Succeeds SMO — taken over');
      expect(replacedBy).not.toBe(replaces);
    });

    it('falls back to direction when only that is published', () => {
      const { predecessorCode: _p1, successorCode: _s1, ...smoOnlyDirection } = seenFromSmo;
      const { predecessorCode: _p2, successorCode: _s2, ...soOnlyDirection } = seenFromSo;
      const { replacedBy, replaces } = cells(smoOnlyDirection, soOnlyDirection);

      expect(replacedBy).toBe('Succeeded by SO — taken over');
      expect(replaces).toBe('Succeeds SMO — taken over');
      expect(replacedBy).not.toBe(replaces);
    });

    it('still separates the two ends on production, which publishes neither', () => {
      // No codes and no direction: the array the entry came from is all there
      // is, which is why the caller is forced to state it.
      const { direction: _d1, predecessorCode: _p1, successorCode: _s1, ...smoLegacy } = seenFromSmo;
      const { direction: _d2, predecessorCode: _p2, successorCode: _s2, ...soLegacy } = seenFromSo;
      const { replacedBy, replaces } = cells(smoLegacy, soLegacy);

      expect(replacedBy).toBe('Succeeded by SO — taken over');
      expect(replaces).toBe('Succeeds SMO — taken over');
      expect(replacedBy).not.toBe(replaces);
    });
  });

  it('should keep the absolute codes of the edge on the table rows', () => {
    const link = component.institutions[0].replacedBy[0];

    expect(link.predecessorCode).toBe(1);
    expect(link.successorCode).toBe(2);
    expect(link.direction).toBe('successor');
  });

  it('should let the global filter match what an institution replaces', () => {
    // Only the previous names of a rename used to be searchable, so a successor
    // could not be found by the name of the institution it took over.
    expect(component.institutions[1].searchText).toContain('Old Institution');
  });

  it('should reload with the selected status filter', () => {
    component.statusFilter = 'ended';
    component.onStatusFilterChange();
    expect(serviceMock.getInstitutions).toHaveBeenLastCalledWith('ended');
  });
});
