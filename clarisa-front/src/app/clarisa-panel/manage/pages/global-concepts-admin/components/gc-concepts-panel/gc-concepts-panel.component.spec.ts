import { of, throwError } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminConcept, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { buildConceptBody, emptyForm, formFromConcept, GcConceptsPanelComponent } from './gc-concepts-panel.component';

describe('GcConceptsPanelComponent', () => {
  const concept = (termId: number, label: string, status: AdminConcept['status'] = 'approved'): AdminConcept =>
    ({
      term_id: termId,
      preferred_label: label,
      definition: `Definition of ${label}`,
      short_definition: null,
      scope_note: null,
      example_of_use: null,
      term_type: null,
      meliaf_function: ['monitoring'],
      meliaf_phase_primary: null,
      derivation: null,
      source_citation: null,
      source_url: null,
      steward: null,
      notes: null,
      status,
      version: '1.0',
      date_modified: '2026-09-01',
      alternative_labels: [{ label: 'OC', language: 'en', kind: 'acronym', discouraged: false }],
      replaced_by: null
    }) as unknown as AdminConcept;

  let api: Record<string, jest.Mock>;
  let component: GcConceptsPanelComponent;

  beforeEach(() => {
    api = {
      adminConcepts: jest.fn(() => of([concept(1, 'Outcome'), concept(2, 'Output', 'draft')])),
      lists: jest.fn(() => of({ meliaf_function: [{ value: 'monitoring', label: 'Monitoring' }] })),
      updateConcept: jest.fn(() => of(concept(1, 'Outcomes'))),
      createConcept: jest.fn(() => of(concept(3, 'New'))),
      setStatus: jest.fn(() => of(concept(2, 'Output', 'deprecated')))
    };
    component = new GcConceptsPanelComponent(
      api as unknown as GlobalConceptsApiService,
      { add: jest.fn() } as unknown as MessageService,
      { confirm: jest.fn(({ accept }) => accept()) } as unknown as ConfirmationService
    );
    component.ngOnInit();
  });

  it('shows function labels and filters by status and by alternative label', () => {
    expect(component.rows[0].functionsText).toBe('Monitoring');

    component.statusFilter = 'draft';
    component.applyFilters();
    expect(component.rows.map(row => row.term_id)).toEqual([2]);

    component.statusFilter = 'all';
    component.search = 'oc';
    component.applyFilters();
    expect(component.rows.map(row => row.term_id)).toEqual([1, 2]);
  });

  it('stops loading and keeps the message when the list fails', () => {
    api['adminConcepts'].mockReturnValueOnce(throwError(() => ({ error: { message: 'Global Concepts is disabled' } })));
    component.load();

    expect(component.loading).toBe(false);
    expect(component.loadError).toBe('Global Concepts is disabled');
  });

  it('sends only the fields that changed on update, and an emptied field as ""', () => {
    const original = formFromConcept(concept(1, 'Outcome'));
    const edited = { ...original, preferred_label: 'Outcomes', definition: '', meliaf_function: [] };

    expect(buildConceptBody(edited, original)).toEqual({ preferred_label: 'Outcomes', definition: '', meliaf_function: [] });
    expect(buildConceptBody(original, original)).toEqual({});
  });

  it('sends only the filled fields on create', () => {
    const form = { ...emptyForm(), preferred_label: ' New ', term_type: 'concept', term_id: 2374 };

    expect(buildConceptBody(form, null)).toEqual({ preferred_label: 'New', term_type: 'concept', term_id: 2374 });
  });

  it('updates the concept being edited', () => {
    component.openEdit(component.concepts[0]);
    component.form.preferred_label = 'Outcomes';
    component.save();

    expect(api['updateConcept']).toHaveBeenCalledWith('meliaf', 1, { preferred_label: 'Outcomes' });
    expect(component.dialogVisible).toBe(false);
  });

  it('asks for a replacement or a reason before deprecating', () => {
    component.openEdit(component.concepts[1]);
    component.newStatus = 'deprecated';
    expect(component.statusChangeError).toContain('replacement');

    component.replacementTermId = 1;
    expect(component.statusChangeError).toBeNull();
    component.changeStatus();

    expect(api['setStatus']).toHaveBeenCalledWith('meliaf', 2, { status: 'deprecated', replaced_by_term_id: 1 });
  });

  it('updates the AI index and reports what was embedded', () => {
    api['refreshEmbeddings'] = jest.fn(() => of({ embedded: 3, unchanged: 40 }));
    component.refreshIndex();
    expect(api['refreshEmbeddings']).toHaveBeenCalledWith('meliaf');
    expect(component.indexing).toBe(false);
  });
});
