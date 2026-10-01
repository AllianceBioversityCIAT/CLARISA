import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
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
      functions: ['monitoring'],
      phase_primary: null,
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
      lists: jest.fn(() => of({ functions: [{ value: 'monitoring', label: 'Monitoring' }] })),
      updateConcept: jest.fn(() => of(concept(1, 'Outcomes'))),
      createConcept: jest.fn(() => of(concept(3, 'New'))),
      setStatus: jest.fn(() => of(concept(2, 'Output', 'deprecated'))),
      conceptFields: jest.fn(() => of([]))
    };
    localStorage.clear();
    component = new GcConceptsPanelComponent(api as unknown as GlobalConceptsApiService, { add: jest.fn() } as unknown as MessageService);
    component.ngOnInit();
  });

  it('shows function labels and filters by status and by alternative label', () => {
    expect(component.rows[0].functionsText).toBe('Monitoring');

    component.filters = { ...component.filters, statuses: ['draft'] };
    component.applyFilters();
    expect(component.rows.map(row => row.term_id)).toEqual([2]);

    component.filters = { ...component.filters, statuses: [], search: 'oc' };
    component.applyFilters();
    expect(component.rows.map(row => row.term_id)).toEqual([1, 2]);
  });

  describe('text search', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const type = (text: string) => {
      component.filters = { ...component.filters, search: text };
      component.onSearchChange();
    };

    it('shows the local match at once, then the back ranking, best first', () => {
      api['adminConcepts'].mockReturnValueOnce(of([concept(2, 'Output'), concept(1, 'Outcome')]));
      type('out');
      expect(component.rows.map(row => row.term_id)).toEqual([1, 2]);
      expect(component.ranked).toBe(false);

      jest.advanceTimersByTime(250);
      expect(api['adminConcepts']).toHaveBeenLastCalledWith('meliaf-taxonomy', undefined, 'out');
      expect(component.ranked).toBe(true);
      expect(component.rows.map(row => row.term_id)).toEqual([2, 1]);
    });

    it('asks the back once per pause, not once per keystroke', () => {
      const calls = api['adminConcepts'].mock.calls.length;
      type('o');
      type('ou');
      type('out');
      jest.advanceTimersByTime(250);
      expect(api['adminConcepts'].mock.calls.length).toBe(calls + 1);
    });

    it('keeps the other filters on top of the ranking', () => {
      api['adminConcepts'].mockReturnValueOnce(of([concept(2, 'Output'), concept(1, 'Outcome')]));
      component.filters = { ...component.filters, statuses: ['approved'] };
      type('out');
      jest.advanceTimersByTime(250);
      expect(component.rows.map(row => row.term_id)).toEqual([1]);
    });

    it('falls back to the plain local match when the back cannot rank, and says so', () => {
      api['adminConcepts'].mockReturnValueOnce(throwError(() => ({ status: 500 })));
      type('outc');
      jest.advanceTimersByTime(250);
      expect(component.searchFailed).toBe(true);
      expect(component.ranked).toBe(false);
      expect(component.rows.map(row => row.term_id)).toEqual([1]);
    });

    it('drops a ranking for a query the reader already changed', () => {
      api['adminConcepts'].mockReturnValueOnce(of([concept(2, 'Output')]));
      type('outp');
      jest.advanceTimersByTime(250);
      component.filters = { ...component.filters, search: 'outc' };
      expect(component.ranked).toBe(false);
    });

    it('clearing the box goes back to every concept, alphabetically', () => {
      api['adminConcepts'].mockReturnValueOnce(of([concept(2, 'Output')]));
      type('outp');
      jest.advanceTimersByTime(250);
      component.clearFilters();
      expect(component.ranked).toBe(false);
      expect(component.rows.length).toBe(2);
    });
  });

  it('stops loading and keeps the message when the list fails', () => {
    api['adminConcepts'].mockReturnValueOnce(throwError(() => ({ error: { message: 'Global Concepts is disabled' } })));
    component.load();

    expect(component.loading).toBe(false);
    expect(component.loadError).toBe('Global Concepts is disabled');
  });

  it('sends only the fields that changed on update, and an emptied field as ""', () => {
    const original = formFromConcept(concept(1, 'Outcome'));
    const edited = { ...original, preferred_label: 'Outcomes', definition: '', functions: [] };

    expect(buildConceptBody(edited, original)).toEqual({ preferred_label: 'Outcomes', definition: '', functions: [] });
    expect(buildConceptBody(original, original)).toEqual({});
  });

  it('sends only the filled fields on create', () => {
    const form = { ...emptyForm(), preferred_label: ' New ', term_type: 'concept', term_id: 2374 };

    expect(buildConceptBody(form, null)).toEqual({ preferred_label: 'New', term_type: 'concept', term_id: 2374 });
  });

  it('shows a chip per active filter, removes one with its ×, and clears all', () => {
    component.filters = { ...component.filters, statuses: ['draft', 'approved'], functions: ['monitoring'], missingDefinition: true };
    component.applyFilters();
    expect(component.chips.map(chip => chip.label)).toEqual(['Status: Draft', 'Status: Approved', 'Function: Monitoring', 'Missing definition']);
    expect(component.rows).toEqual([]);

    component.removeFilter(component.chips[3]);
    expect(component.rows.map(row => row.term_id)).toEqual([1, 2]);
    component.removeFilter(component.chips[0]);
    expect(component.rows.map(row => row.term_id)).toEqual([1]);

    component.clearFilters();
    expect(component.hasFilters).toBe(false);
    expect(component.rows.length).toBe(2);
  });

  it('opens the SHORT create dialog, prefilled, from a Usage request once and tells the shell it was used', () => {
    jest.useFakeTimers();
    try {
      const panel = new GcConceptsPanelComponent(api as unknown as GlobalConceptsApiService, { add: jest.fn() } as unknown as MessageService);
      const open = jest.fn();
      const openCreate = jest.fn();
      panel.createDialog = { open } as never;
      panel.dialog = { openCreate, openEdit: jest.fn() } as never;
      const handled = jest.fn();
      panel.createHandled.subscribe(handled);
      panel.createRequest = { label: 'theory of change', token: 4 };

      panel.ngOnInit();
      jest.runOnlyPendingTimers();

      expect(open).toHaveBeenCalledWith('theory of change');
      // The full editor is never opened in create mode any more.
      expect(openCreate).not.toHaveBeenCalled();
      expect(handled).toHaveBeenCalledWith(4);
    } finally {
      jest.useRealTimers();
    }
  });

  it('"New concept" opens the short form, and a created concept opens the full editor on it and reloads the table', () => {
    const open = jest.fn();
    const openEdit = jest.fn();
    const openCreate = jest.fn();
    component.createDialog = { open } as never;
    component.dialog = { openEdit, openCreate } as never;

    component.openCreate();
    expect(open).toHaveBeenCalledWith('');
    expect(openCreate).not.toHaveBeenCalled();

    api['adminConcepts'].mockClear();
    const created = concept(3, 'New') as never;
    component.onCreated(created);
    expect(openEdit).toHaveBeenCalledWith(created);
    expect(api['adminConcepts']).toHaveBeenCalledTimes(1);

    // An answer without a code cannot be edited: only the table reloads.
    openEdit.mockClear();
    component.onCreated({} as never);
    expect(openEdit).not.toHaveBeenCalled();
  });

  describe('custom-field columns', () => {
    const linkField = {
      id: 7,
      code: 'related',
      label: 'Related indicator',
      type: 'term_link',
      list_code: null,
      required: false,
      is_public: true,
      sort: 0,
      is_active: true,
      help: null
    };
    const oldField = { ...linkField, id: 8, code: 'old', label: 'Old', is_active: false };

    const withExtra = () => {
      const linked = { ...concept(1, 'Outcome'), extra: { related: [2] } };
      api['adminConcepts'].mockReturnValue(of([linked, concept(2, 'Output', 'draft')]));
      api['conceptFields'].mockReturnValue(of([linkField, oldField]));
    };

    it('offers only active fields and shows a linked concept by its label', () => {
      withExtra();
      const panel = new GcConceptsPanelComponent(api as unknown as GlobalConceptsApiService, { add: jest.fn() } as unknown as MessageService);
      panel.ngOnInit();

      expect(panel.fieldColumnOptions).toEqual([{ label: 'Related indicator', value: 'related' }]);
      expect(panel.shownColumns).toEqual([]);
      expect(panel.rows.find(row => row.term_id === 1)?.x['related']).toBe('Output');
      expect(panel.rows.find(row => row.term_id === 2)?.x['related']).toBe('');
    });

    it('remembers the columns switched on, and drops a code whose field is gone', () => {
      withExtra();
      localStorage.setItem('gc-concepts-columns:meliaf-taxonomy', JSON.stringify(['related', 'deleted_field']));
      const panel = new GcConceptsPanelComponent(api as unknown as GlobalConceptsApiService, { add: jest.fn() } as unknown as MessageService);
      panel.ngOnInit();
      expect(panel.shownColumns.map(field => field.code)).toEqual(['related']);

      panel.shownFields = [];
      panel.onColumnsChange();
      expect(localStorage.getItem('gc-concepts-columns:meliaf-taxonomy')).toBe('[]');
    });

    it('keeps the table working when the fields fail to load', () => {
      api['conceptFields'].mockReturnValue(throwError(() => ({ status: 500 })));
      const panel = new GcConceptsPanelComponent(api as unknown as GlobalConceptsApiService, { add: jest.fn() } as unknown as MessageService);
      panel.ngOnInit();
      expect(panel.customFields).toEqual([]);
      expect(panel.rows.length).toBe(2);
    });
  });
});
