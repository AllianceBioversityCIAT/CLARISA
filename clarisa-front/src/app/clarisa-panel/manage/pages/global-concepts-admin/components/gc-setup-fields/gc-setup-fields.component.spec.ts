import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { CustomField, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { GcSetupFieldsComponent } from './gc-setup-fields.component';

describe('GcSetupFieldsComponent', () => {
  const stored: CustomField = { id: 5, code: 'owner', label: 'Owner', type: 'text', list_code: null, required: false, is_public: true, sort: 0, is_active: true, help: null };
  let api: Record<string, jest.Mock>;
  let component: GcSetupFieldsComponent;

  beforeEach(() => {
    api = {
      fields: jest.fn(() => of([stored])),
      createField: jest.fn(() => of({ ...stored, id: 6, code: 'review_date', type: 'date' })),
      updateField: jest.fn(() => of(stored))
    };
    component = new GcSetupFieldsComponent(api as unknown as GlobalConceptsApiService, { add: jest.fn() } as unknown as MessageService);
    component.ngOnInit();
  });

  it('suggests the code from the label on a new field, until the code is typed by hand', () => {
    component.openCreate();
    component.form.label = 'Review date';
    component.onLabelChange('Review date');
    expect(component.form.code).toBe('review_date');
    expect(component.form.sort).toBe(1);

    component.onCodeChange();
    component.onLabelChange('Next review date');
    expect(component.form.code).toBe('review_date');
  });

  it('shows code and type read-only when editing, and never sends them', () => {
    component.openEdit(stored);
    expect(component.locked('code')).toBe(true);
    expect(component.locked('type')).toBe(true);

    component.onLabelChange('Something else');
    expect(component.form.code).toBe('owner');

    component.form.label = 'Steward';
    component.form.code = 'steward';
    component.save();
    expect(api['updateField']).toHaveBeenCalledWith('meliaf-taxonomy', 5, { label: 'Steward' });
  });

  it('keeps the "Values come from" options stable between change-detection runs (a new array lost the click)', () => {
    component.listCodes = ['funding_source', 'region'];
    const first = component.listOptions;
    expect(component.listOptions).toBe(first);
    expect(first).toEqual([
      { label: 'funding_source', value: 'funding_source' },
      { label: 'region', value: 'region' }
    ]);
    component.listCodes = ['region'];
    expect(component.listOptions).not.toBe(first);
    expect(component.listOptions).toEqual([{ label: 'region', value: 'region' }]);
  });
});
