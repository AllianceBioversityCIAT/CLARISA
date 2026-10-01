import { AdminConcept } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { conceptTabs, emptyIconForm, iconBody, iconFormError, labelRowsFrom, labelsError, labelsPayload, resolveTab } from './concept-editor';

describe('concept editor rules', () => {
  it('opens only Details and Custom fields while creating', () => {
    const open = conceptTabs(true).filter(tab => !tab.lockedReason).map(tab => tab.id);
    expect(open).toEqual(['details', 'fields']);
    expect(conceptTabs(false).every(tab => !tab.lockedReason)).toBe(true);
    expect(resolveTab('labels', true)).toBe('details');
    expect(resolveTab('labels', false)).toBe('labels');
  });

  it('builds the label set from the concept and sends it without blank rows', () => {
    const concept = {
      preferred_labels: [
        { label: 'Outcome', language: 'en' },
        { label: 'Résultat', language: 'fr' }
      ],
      alternative_labels: [{ label: 'OC', language: 'en', kind: 'acronym', discouraged: true }]
    } as unknown as AdminConcept;
    const rows = [...labelRowsFrom(concept), { label: '  ', kind: 'alt' as const, language: 'en', discouraged: false }];

    expect(labelsPayload(rows)).toEqual([
      { label: 'Résultat', language: 'fr', kind: 'pref', status: 'active' },
      { label: 'OC', language: 'en', kind: 'acronym', status: 'discouraged' }
    ]);
  });

  it('refuses a preferred label without language, and duplicates', () => {
    expect(labelsError([{ label: 'Résultat', kind: 'pref', language: '', discouraged: false }])).toContain('language');
    const dup = { label: 'OC', kind: 'acronym' as const, language: 'en', discouraged: false };
    expect(labelsError([dup, { ...dup, label: 'oc' }])).toContain('twice');
    expect(labelsError([dup])).toBeNull();
  });

  it('asks for alt text only when the icon is final', () => {
    const form = { ...emptyIconForm(), icon_status: 'final' };
    expect(iconFormError(form)).toContain('alt text');
    expect(iconFormError({ ...form, alt_text: 'A leaf' })).toBeNull();
    expect(iconFormError({ ...form, icon_status: 'draft' })).toBeNull();
    expect(iconFormError({ ...form, alt_text: 'A leaf', file_link_primary: 'javascript:alert(1)' })).toContain('http');
  });

  it('sends the filled icon fields on create and only the changes, cleared as null, on update', () => {
    const created = iconBody({ ...emptyIconForm(), icon_status: 'final', alt_text: ' A leaf ', year_created: 2024 }, null);
    expect(created).toEqual({ icon_status: 'final', alt_text: 'A leaf', year_created: 2024 });

    const original = { ...emptyIconForm(), icon_code: 'LEAF', designer: 'Ana' };
    expect(iconBody({ ...original, designer: '' }, original)).toEqual({ designer: null });
  });
});
