import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminConceptDetail, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { GcMappingsEditorComponent, MAPPING_JUSTIFICATIONS, MappingForm, emptyMappingForm, mappingBody, mappingFormError } from './gc-mappings-editor.component';

describe('GcMappingsEditorComponent', () => {
  const form = (patch: Partial<MappingForm>): MappingForm => ({
    ...emptyMappingForm(),
    target_scheme: 'AGROVOC',
    target_uri: 'http://aims.fao.org/aos/agrovoc/c_1',
    ...patch
  });

  it('offers only the two ways a person can match: manual review and lexical match', () => {
    expect(MAPPING_JUSTIFICATIONS.map(option => option.value)).toEqual(['manual', 'lexical']);
  });

  it('sends justification only as manual / lexical, and confidence only as a number in 0..1', () => {
    expect(mappingBody(form({ justification: 'lexical', confidence: '0.8' }))).toEqual({
      target_scheme: 'AGROVOC',
      target_uri: 'http://aims.fao.org/aos/agrovoc/c_1',
      match_type: 'exact',
      justification: 'lexical',
      confidence: 0.8
    });
    expect(mappingBody(form({ justification: 'manual', confidence: 0 }))).toEqual(expect.objectContaining({ justification: 'manual', confidence: 0 }));

    const loose = mappingBody(form({ justification: 'because it looks the same' as never, confidence: '' }));
    expect(loose).not.toHaveProperty('justification');
    expect(loose).not.toHaveProperty('confidence');
    expect(mappingBody(form({ justification: null }))).not.toHaveProperty('justification');
  });

  it('never sends a key the back does not know', () => {
    const body = mappingBody(form({ target_label: 'Outcome', justification: 'manual', confidence: 1 }));
    expect(Object.keys(body).sort()).toEqual(['confidence', 'justification', 'match_type', 'target_label', 'target_scheme', 'target_uri']);
  });

  it('refuses a confidence outside 0..1 before it reaches the back', () => {
    expect(mappingFormError(form({ confidence: '1.5' }))).toContain('between 0 and 1');
    expect(mappingFormError(form({ confidence: '-0.1' }))).toContain('between 0 and 1');
    expect(mappingFormError(form({ confidence: 'abc' }))).toContain('between 0 and 1');
    expect(mappingFormError(form({ confidence: '0.5' }))).toBeNull();
    expect(mappingFormError(form({ confidence: null }))).toBeNull();
  });

  it('posts the cleaned body and passes the updated concept up', () => {
    const concept = { term_id: 7, preferred_label: 'Outcome', mappings: [] } as unknown as AdminConceptDetail;
    const api = { addMapping: jest.fn(() => of(concept)) };
    const component = new GcMappingsEditorComponent(
      api as unknown as GlobalConceptsApiService,
      { add: jest.fn() } as unknown as MessageService,
      {} as ConfirmationService
    );
    const updated = jest.fn();
    component.updated.subscribe(updated);
    component.concept = concept;
    component.form = form({ justification: 'manual', confidence: '0.9' });

    component.add();

    expect(api.addMapping).toHaveBeenCalledWith('meliaf', 7, expect.objectContaining({ justification: 'manual', confidence: 0.9 }));
    expect(updated).toHaveBeenCalledWith(concept);
  });

  it('shows the stored SSSOM code in words', () => {
    const component = new GcMappingsEditorComponent({} as GlobalConceptsApiService, {} as MessageService, {} as ConfirmationService);
    expect(component.justificationLabel('lexical')).toBe('Lexical match');
    expect(component.justificationLabel('ai_suggested')).toBe('AI suggestion');
  });
});
