import { Subject, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AdminConceptDetail, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { filterConceptOptions } from '../gc-concept-picker/gc-concept-picker.component';
import { GcRelationsEditorComponent } from './gc-relations-editor.component';

describe('GcRelationsEditorComponent', () => {
  const concept = {
    term_id: 1,
    preferred_label: 'Outcome',
    broader_terms: [{ term_id: 5, uri: '', preferred_label: 'Result' }],
    related_terms: [],
    narrower_terms: [{ term_id: 8, uri: '', preferred_label: 'Intermediate outcome' }]
  } as unknown as AdminConceptDetail;

  let api: Record<string, jest.Mock>;
  let component: GcRelationsEditorComponent;
  let updated: jest.Mock;

  beforeEach(() => {
    api = {
      addRelation: jest.fn(() => of({ ...concept, related_terms: [{ term_id: 3, uri: '', preferred_label: 'Output' }] })),
      removeRelation: jest.fn(() => of({ ...concept, broader_terms: [] }))
    };
    component = new GcRelationsEditorComponent(api as unknown as GlobalConceptsApiService, { add: jest.fn() } as unknown as MessageService);
    component.concept = concept;
    updated = jest.fn();
    component.updated.subscribe(updated);
  });

  it('adds and removes with the kind and the target, and passes the updated concept up', () => {
    component.add('related', { term_id: 3, preferred_label: 'Output' });
    expect(api['addRelation']).toHaveBeenCalledWith('meliaf-taxonomy', 1, { kind: 'related', target_term_id: 3 });
    expect(updated).toHaveBeenCalledWith(expect.objectContaining({ related_terms: [expect.objectContaining({ term_id: 3 })] }));

    component.remove('broader', concept.broader_terms[0]);
    expect(api['removeRelation']).toHaveBeenCalledWith('meliaf-taxonomy', 1, { kind: 'broader', target_term_id: 5 });
  });

  it('shows the back refusal under the list it belongs to (cycles, S27)', () => {
    api['addRelation'].mockReturnValueOnce(throwError(() => ({ error: { message: 'This broader link would create a cycle' } })));
    component.add('broader', { term_id: 8, preferred_label: 'Intermediate outcome' });

    expect(component.error).toEqual({ kind: 'broader', message: 'This broader link would create a cycle' });
    expect(component.busy).toBeNull();
    expect(updated).not.toHaveBeenCalled();
  });

  it('sends one write at a time and never links the concept to itself', () => {
    const answer = new Subject<AdminConceptDetail>();
    api['addRelation'].mockReturnValue(answer);
    component.add('related', { term_id: 3, preferred_label: 'Output' });
    component.add('related', { term_id: 4, preferred_label: 'Impact' });
    component.add('related', { term_id: 1, preferred_label: 'Outcome' });
    expect(api['addRelation']).toHaveBeenCalledTimes(1);

    expect(component.excluded('broader')).toEqual([1, 5]);
    expect(filterConceptOptions([{ term_id: 1, preferred_label: 'Outcome' }, { term_id: 6, preferred_label: 'Out of scope' }], 'out', component.excluded('broader'))).toEqual([
      { term_id: 6, preferred_label: 'Out of scope' }
    ]);
  });
});
