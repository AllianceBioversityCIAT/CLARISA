// The spec tsconfig carries no Node typings; jest runs on Node, so both exist at runtime.
declare const require: (id: string) => any;
declare const __dirname: string;
import { Subject, of, throwError } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminConceptDetail, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { GcConceptDialogComponent } from './gc-concept-dialog.component';

describe('GcConceptDialogComponent', () => {
  const concept = (termId: number, label: string, extra: Partial<AdminConceptDetail> = {}): AdminConceptDetail =>
    ({
      term_id: termId,
      preferred_label: label,
      definition: `Definition of ${label}`,
      short_definition: null,
      scope_note: null,
      example_of_use: null,
      term_type: null,
      meliaf_function: [],
      meliaf_phase_primary: null,
      derivation: null,
      source_citation: null,
      source_url: null,
      steward: null,
      notes: null,
      status: 'approved',
      version: '1.0',
      preferred_labels: [{ label, language: 'en' }],
      alternative_labels: [],
      ai_generated_fields: ['scope_note'],
      replaced_by: null,
      extra: { owner: 'Ana' },
      ...extra
    }) as unknown as AdminConceptDetail;

  const fields = [
    { id: 1, code: 'owner', label: 'Owner', type: 'text', list_code: null, required: true, is_public: true, sort: 0, is_active: true, help: null },
    { id: 2, code: 'old', label: 'Old', type: 'text', list_code: null, required: false, is_public: true, sort: 1, is_active: false, help: null }
  ];

  let api: Record<string, jest.Mock>;
  let messages: { add: jest.Mock };
  let component: GcConceptDialogComponent;

  beforeEach(() => {
    api = {
      conceptFields: jest.fn(() => of(fields)),
      updateConcept: jest.fn(() => of(concept(1, 'Outcomes'))),
      createConcept: jest.fn(() => of(concept(9, 'New'))),
      setStatus: jest.fn(() => of(concept(2, 'Output', { status: 'deprecated' }))),
      aiDraft: jest.fn(() => of({ short_definition: 'A change caused by the work.' })),
      adminConcept: jest.fn(() => of({ ...concept(1, 'Outcome'), history: [{ action: 'update', changes: { definition: {} }, changed_at: '2026-09-01' }] })),
      conceptsAssistStatus: jest.fn(() => of({ enabled: false, remainingUsd: 0 }))
    };
    messages = { add: jest.fn() };
    component = new GcConceptDialogComponent(
      api as unknown as GlobalConceptsApiService,
      messages as unknown as MessageService,
      { confirm: jest.fn(({ accept }) => accept()) } as unknown as ConfirmationService
    );
    component.concepts = [concept(1, 'Outcome'), concept(2, 'Output', { status: 'draft' })];
  });

  it('opens on Details, loads only the active custom fields and fills them from extra', () => {
    component.openEdit(component.concepts[0], 'labels');

    expect(component.visible).toBe(true);
    expect(component.tab).toBe('labels');
    expect(component.fields.map(field => field.code)).toEqual(['owner']);
    expect(component.values).toEqual({ owner: 'Ana' });
  });

  it('locks the concept-only tabs while creating and prefills the label', () => {
    component.openCreate('  theory of change ');

    expect(component.form.preferred_label).toBe('theory of change');
    component.selectTab(component.tabs.find(tab => tab.id === 'relations')!);
    expect(component.tab).toBe('details');
    component.selectTab(component.tabs.find(tab => tab.id === 'fields')!);
    expect(component.tab).toBe('fields');
  });

  it('sends the changed details and the changed custom values in one PATCH', () => {
    component.openEdit(component.concepts[0]);
    component.form.preferred_label = 'Outcomes';
    component.values['owner'] = 'Luis';
    component.save();

    expect(api['updateConcept']).toHaveBeenCalledWith('meliaf', 1, { preferred_label: 'Outcomes', extra: { owner: 'Luis' } });
    expect(component.visible).toBe(false);
  });

  it('blocks the save when a required custom field is emptied', () => {
    component.openEdit(component.concepts[0]);
    component.values['owner'] = '';

    expect(component.formError).toContain('Owner is required');
    component.save();
    expect(api['updateConcept']).not.toHaveBeenCalled();
  });

  it('locks the save on the first click until the back answers', () => {
    const answer = new Subject<AdminConceptDetail>();
    api['updateConcept'].mockReturnValue(answer);
    component.openEdit(component.concepts[0]);
    component.form.preferred_label = 'Outcomes';

    component.save();
    component.save();
    expect(component.saving).toBe(true);
    expect(api['updateConcept']).toHaveBeenCalledTimes(1);

    answer.error({ error: { message: 'Conflict' } });
    expect(component.saving).toBe(false);
    expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', detail: 'Conflict' }));
  });

  it('shows the AI draft inline; accepting fills the field and marks it AI-generated on save', () => {
    component.aiEnabled = true;
    component.openEdit(component.concepts[0]);
    component.draft('short_definition');

    expect(api['aiDraft']).toHaveBeenCalledWith('meliaf', { preferred_label: 'Outcome', definition: 'Definition of Outcome', fields: ['short_definition'] });
    expect(component.drafts.short_definition).toBe('A change caused by the work.');
    expect(component.form.short_definition).toBe('');

    component.acceptDraft('short_definition');
    expect(component.form.short_definition).toBe('A change caused by the work.');
    expect(component.drafts.short_definition).toBeUndefined();

    component.save();
    expect(api['updateConcept']).toHaveBeenCalledWith('meliaf', 1, {
      short_definition: 'A change caused by the work.',
      ai_generated_fields: ['scope_note', 'short_definition']
    });
  });

  it('drops the AI mark of a field the editor rewrites by hand', () => {
    component.openEdit(component.concepts[0]);
    component.form.scope_note = 'Written by a person';

    component.save();
    expect(api['updateConcept']).toHaveBeenCalledWith('meliaf', 1, {
      scope_note: 'Written by a person',
      ai_generated_fields: []
    });
  });

  it('discarding a draft changes nothing', () => {
    component.aiEnabled = true;
    component.openEdit(component.concepts[0]);
    component.draft('short_definition');
    component.discardDraft('short_definition');

    expect(component.hasChanges).toBe(false);
    expect(component.aiAccepted.size).toBe(0);
  });

  it('keeps a new concept open in edit mode so labels and relations unlock', () => {
    component.openCreate('New');
    component.values['owner'] = 'Ana';
    component.save();

    expect(api['createConcept']).toHaveBeenCalledWith('meliaf', { preferred_label: 'New', extra: { owner: 'Ana' } });
    expect(component.visible).toBe(true);
    expect(component.editing?.term_id).toBe(9);
    expect(component.tabs.every(tab => !tab.lockedReason)).toBe(true);
  });

  it('tells the host to reload once, when the dialog closes after a write', () => {
    const changed = jest.fn();
    component.changed.subscribe(changed);
    component.openEdit(component.concepts[0]);
    component.onConceptUpdated(concept(1, 'Outcome', { broader_terms: [] }));
    expect(changed).not.toHaveBeenCalled();

    component.close();
    expect(changed).toHaveBeenCalledTimes(1);
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

  it('loads the history newest first, once, and says why when it fails', () => {
    component.openEdit(component.concepts[0]);
    component.selectTab(component.tabs.find(tab => tab.id === 'history')!);
    component.selectTab(component.tabs.find(tab => tab.id === 'history')!);

    expect(api['adminConcept']).toHaveBeenCalledTimes(1);
    expect(component.history.length).toBe(1);

    api['adminConcept'].mockReturnValueOnce(throwError(() => ({ error: { message: 'Not found' } })));
    component.loadHistory(true);
    expect(component.historyError).toBe('Not found');
  });

  describe('answers that arrive after another concept was opened', () => {
    const tabOption = (id: string) => component.tabs.find(option => option.id === id)!;

    it('drops a late history and lets the new concept load its own', () => {
      const late = new Subject<AdminConceptDetail>();
      api['adminConcept'].mockReturnValueOnce(late);
      component.openEdit(component.concepts[0]);
      component.selectTab(tabOption('history'));
      expect(component.historyLoading).toBe(true);

      component.openEdit(component.concepts[1]);
      expect(component.historyLoading).toBe(false);
      late.next({ ...concept(1, 'Outcome'), history: [{ action: 'update', changes: {}, changed_at: '2026-01-01' }] } as unknown as AdminConceptDetail);
      expect(component.history).toEqual([]);

      component.selectTab(tabOption('history'));
      expect(api['adminConcept']).toHaveBeenLastCalledWith('meliaf', 2);
      expect(component.history).toHaveLength(1);
    });

    it('drops a late AI draft written for the previous concept', () => {
      const late = new Subject<Record<string, string>>();
      api['aiDraft'].mockReturnValueOnce(late);
      component.aiEnabled = true;
      component.openEdit(component.concepts[0]);
      component.draft('short_definition');

      component.openEdit(component.concepts[1]);
      late.next({ short_definition: 'Text about Outcome' });

      expect(component.drafts).toEqual({});
      expect(component.drafting).toEqual({});
    });
  });

  describe('switching tab while a sub-editor saves', () => {
    it('keeps every opened sub-editor mounted for the session, and starts clean for the next concept', () => {
      component.openEdit(component.concepts[0]);
      for (const id of ['labels', 'relations', 'mappings', 'icons', 'details']) component.selectTab(component.tabs.find(option => option.id === id)!);
      expect([...component.visited].sort()).toEqual(['details', 'icons', 'labels', 'mappings', 'relations']);

      const session = component.session;
      component.openEdit(component.concepts[1], 'labels');
      expect(component.session).toBe(session + 1);
      expect([...component.visited]).toEqual(['labels']);
    });

    it('hides the sub-editors instead of destroying them on tab change (the template)', () => {
      const fs = require('fs');
      const path = require('path');
      const html: string = fs.readFileSync(path.join(__dirname, 'gc-concept-dialog.component.html'), 'utf8');
      for (const editor of ['labels', 'relations', 'mappings', 'icons']) {
        const tag = html.match(new RegExp(`<app-gc-${editor}-editor[^>]*>`, 's'))?.[0] ?? '';
        expect(tag).toContain(`[hidden]="tab !== '${editor}'"`);
        expect(tag).not.toContain(`*ngIf="tab === '${editor}'"`);
      }
    });
  });

  describe('assistant', () => {
    it('shows the toggle only when concepts-assist/status says enabled, and widens the dialog when open', () => {
      api['conceptsAssistStatus'].mockReturnValue(of({ enabled: true, remainingUsd: 4.2 }));
      component.openEdit(component.concepts[0]);

      expect(api['conceptsAssistStatus']).toHaveBeenCalledWith('meliaf');
      expect(component.assistShown).toBe(true);
      expect(component.assistRemaining).toBe(4.2);
      expect(component.dialogStyle['width']).toBe('920px');
      component.toggleAssist();
      expect(component.assistOpen).toBe(true);
      expect(component.dialogStyle['width']).toBe('min(1320px, 96vw)');

      // Asked once per scheme, not on every concept.
      component.openEdit(component.concepts[1]);
      expect(api['conceptsAssistStatus']).toHaveBeenCalledTimes(1);
    });

    it('stays hidden, without an error, when disabled or when the status call fails (no AI for this user)', () => {
      component.openEdit(component.concepts[0]);
      expect(component.assistShown).toBe(false);
      component.toggleAssist();
      expect(component.assistOpen).toBe(false);

      api['conceptsAssistStatus'].mockReturnValue(throwError(() => ({ status: 403 })));
      component.scheme = 'other';
      component.openEdit(component.concepts[0]);
      expect(component.assistShown).toBe(false);
      expect(messages.add).not.toHaveBeenCalled();
    });

    it('is not offered in the full create mode', () => {
      api['conceptsAssistStatus'].mockReturnValue(of({ enabled: true, remainingUsd: 1 }));
      component.openEdit(component.concepts[0]);
      component.openCreate('New');
      expect(component.assistShown).toBe(false);
    });

    it('logs hand edits with x:<code> for custom fields, drafts the whitelisted values, and starts clean for the next concept', () => {
      component.openEdit(component.concepts[0]);
      component.form.definition = 'Mine';
      component.onHandEdit('definition', 'Mine');
      component.values['owner'] = 'Luis';
      component.onCustomEdit({ code: 'owner', value: 'Luis' });

      expect(component.assist.log.pending().map(edit => [edit.field, edit.tab, edit.before, edit.after])).toEqual([
        ['definition', 'details', 'Definition of Outcome', 'Mine'],
        ['x:owner', 'fields', 'Ana', 'Luis']
      ]);
      const draft = component.assist.host!.draft();
      expect(draft['definition']).toBe('Mine');
      expect(draft['x:owner']).toBe('Luis');
      expect('x:old' in draft).toBe(false);
      expect('status' in draft).toBe(false);

      component.openEdit(component.concepts[1]);
      expect(component.assist.log.size).toBe(0);
    });

    it('an assistant text kept by the person saves with the AI provenance, through the normal Save payload', () => {
      component.openEdit(component.concepts[0], 'details');
      const host = component.assist.host!;
      component.assist.writeAi('short_definition', 'A change.');
      component.assist.markSuggested('short_definition', host.baseline('short_definition'), 'A change.', '');
      component.assist.accept('short_definition');

      expect(component.buildBody()).toEqual({ short_definition: 'A change.', ai_generated_fields: ['scope_note', 'short_definition'] });
    });

    it('the assistant writes custom values into the same values the Save sends in extra', () => {
      component.openEdit(component.concepts[0]);
      component.assist.writeAi('x:owner', 'MEL team');
      expect(component.buildBody()).toEqual({ extra: { owner: 'MEL team' } });
    });
  });
});
