import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AdminConceptDetail, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { GcLabelsEditorComponent } from './gc-labels-editor.component';

describe('GcLabelsEditorComponent', () => {
  const concept = {
    term_id: 4,
    preferred_label: 'Outcome',
    language: 'en',
    preferred_labels: [{ label: 'Outcome', language: 'en' }],
    alternative_labels: [{ label: 'OC', language: 'en', kind: 'acronym', discouraged: false }]
  } as unknown as AdminConceptDetail;

  it('sends the whole edited set with kind, language and status', () => {
    // The answer is still in flight when the second click lands: that is the lock under test.
    const reply = new Subject<AdminConceptDetail>();
    const api = { setLabels: jest.fn(() => reply.asObservable()) };
    const component = new GcLabelsEditorComponent(api as unknown as GlobalConceptsApiService, { add: jest.fn() } as unknown as MessageService);
    component.concept = concept;
    component.ngOnChanges({ concept: {} as never });
    expect(component.dirty).toBe(false);

    component.add();
    component.rows[1] = { label: 'Résultat', kind: 'pref', language: 'FR', discouraged: false };
    component.rows[0].discouraged = true;
    component.save();
    component.save();

    expect(api.setLabels).toHaveBeenCalledTimes(1);
    expect(api.setLabels).toHaveBeenCalledWith('meliaf-taxonomy', 4, [
      { label: 'OC', language: 'en', kind: 'acronym', status: 'discouraged' },
      { label: 'Résultat', language: 'fr', kind: 'pref', status: 'active' }
    ]);
    reply.next(concept);
    reply.complete();
    expect(component.saving).toBe(false);
  });
});
