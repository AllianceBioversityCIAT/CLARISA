// The spec tsconfig carries no Node typings; jest runs on Node, so both exist at runtime.
declare const require: (id: string) => any;
declare const __dirname: string;
import { Subject, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AdminConceptDetail, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { createErrorMessage, GcConceptCreateDialogComponent } from './gc-concept-create-dialog.component';

describe('GcConceptCreateDialogComponent', () => {
  let api: Record<string, jest.Mock>;
  let messages: { add: jest.Mock };
  let dialog: GcConceptCreateDialogComponent;
  let created: jest.Mock;

  const conflict = (message: string) => ({ status: 409, error: { response: { response: { message } }, message: 'Conflict Exception' } });

  beforeEach(() => {
    api = { createConcept: jest.fn(() => of({ term_id: 41, preferred_label: 'Outcome' })) };
    messages = { add: jest.fn() };
    dialog = new GcConceptCreateDialogComponent(api as unknown as GlobalConceptsApiService, messages as unknown as MessageService);
    created = jest.fn();
    dialog.created.subscribe(created);
  });

  it('opens with the searched text as label (Usage) and the code tucked away', () => {
    dialog.open('  theory of change ');
    expect(dialog.visible).toBe(true);
    expect(dialog.form).toEqual({ preferred_label: 'theory of change', definition: '', term_id: null });
    expect(dialog.showTermId).toBe(false);
  });

  it('asks only for the label', () => {
    dialog.open();
    expect(dialog.formError).toBe('The preferred label is required.');
    dialog.create();
    expect(api['createConcept']).not.toHaveBeenCalled();

    dialog.form.preferred_label = 'Outcome';
    expect(dialog.formError).toBeNull();
  });

  it('sends only what was filled, then closes and hands the concept to the host with the toast', () => {
    dialog.open('Outcome');
    dialog.form.definition = '  A change.  ';
    dialog.create();

    expect(api['createConcept']).toHaveBeenCalledWith('concepts', { preferred_label: 'Outcome', definition: 'A change.' });
    expect(dialog.visible).toBe(false);
    expect(created).toHaveBeenCalledWith({ term_id: 41, preferred_label: 'Outcome' } as unknown as AdminConceptDetail);
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Concept created', detail: '41 · Outcome — complete the rest when you are ready.' })
    );
  });

  it('keeps an existing TERM ID when given', () => {
    dialog.open('Outcome');
    dialog.form.term_id = 1042;
    dialog.create();
    expect(api['createConcept']).toHaveBeenCalledWith('concepts', { preferred_label: 'Outcome', term_id: 1042 });
  });

  it('locks on the first click: a second click or Enter before the answer sends nothing', () => {
    const answer = new Subject<unknown>();
    api['createConcept'].mockReturnValue(answer);
    dialog.open('Outcome');

    dialog.create();
    dialog.create();
    dialog.create();
    expect(dialog.saving).toBe(true);
    expect(api['createConcept']).toHaveBeenCalledTimes(1);
    // Closing mid-flight would lose the answer.
    dialog.close();
    expect(dialog.visible).toBe(true);

    answer.next({ term_id: 41, preferred_label: 'Outcome' });
    answer.complete();
    expect(dialog.saving).toBe(false);
    expect(created).toHaveBeenCalledTimes(1);
  });

  it('a 409 on the code says so in a sentence, opens the code field, and stays open', () => {
    const answer = new Subject<unknown>();
    api['createConcept'].mockReturnValue(answer);
    dialog.open('Outcome');
    dialog.form.term_id = 12;
    dialog.create();
    answer.error(conflict('term_id 12 is already used in "concepts"'));

    expect(dialog.error).toBe('TERM ID 12 already belongs to another concept. Leave it empty to get the next free code, or keep a different one.');
    expect(dialog.showTermId).toBe(true);
    expect(dialog.visible).toBe(true);
    expect(dialog.saving).toBe(false);
    expect(created).not.toHaveBeenCalled();

    // Editing the form retires the message; the next try can go.
    dialog.touched();
    expect(dialog.error).toBeNull();
  });

  it('a 409 on the label names the label', () => {
    expect(createErrorMessage(conflict('"Outcome" is already the preferred label (en) of another concept in "concepts"'), {
      preferred_label: ' Outcome ',
      definition: '',
      term_id: null
    })).toBe('Another concept is already called “Outcome”. Find it in the list, or give this one a different name.');
  });

  it('any other failure still reads as a sentence', () => {
    expect(createErrorMessage({ status: 500 }, { preferred_label: 'X', definition: '', term_id: null })).toBe(
      'The concept could not be created. Try again in a moment.'
    );
    expect(createErrorMessage({ status: 409, error: {} }, { preferred_label: 'X', definition: '', term_id: null })).toBe(
      'This concept clashes with one that already exists.'
    );
  });

  it('the template has the design line: required label, optional definition, tucked code, one primary', () => {
    const fs = require('fs');
    const path = require('path');
    const html: string = fs.readFileSync(path.join(__dirname, 'gc-concept-create-dialog.component.html'), 'utf8');
    expect(html).toContain('gc-dialog-foot');
    expect(html).toContain('Keep an existing code');
    expect(html).toContain('[text]="info.preferred_label"');
    expect(html).toContain('[text]="info.definition"');
    expect(html).toContain('[text]="info.term_id"');
    expect(html.match(/btn-brand/g)?.length).toBe(1);
    expect(html).toContain('[disabled]="saving || !!formError"');
  });
});
