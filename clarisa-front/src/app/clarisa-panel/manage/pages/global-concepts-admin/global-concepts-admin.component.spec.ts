import { of, throwError } from 'rxjs';
import { GlobalConceptsApiService } from '../../../../shared/services/global-concepts/global-concepts-api.service';
import { GlobalConceptsAdminComponent } from './global-concepts-admin.component';

describe('GlobalConceptsAdminComponent', () => {
  const build = (api: Partial<Record<'schemes' | 'aiStatus', jest.Mock>>) => {
    const component = new GlobalConceptsAdminComponent(api as unknown as GlobalConceptsApiService);
    component.ngOnInit();
    return component;
  };

  it('keeps AI off and the scheme picker hidden with one scheme', () => {
    const component = build({
      schemes: jest.fn(() => of([{ code: 'meliaf', title: 'MELIAF' }])),
      aiStatus: jest.fn(() => of({ enabled: false }))
    });

    expect(component.aiEnabled).toBe(false);
    expect(component.showSchemePicker).toBe(false);
    expect(component.scheme).toBe('meliaf');
  });

  it('turns AI on only when the status says so, and off when the status fails', () => {
    expect(build({ schemes: jest.fn(() => of([])), aiStatus: jest.fn(() => of({ enabled: true })) }).aiEnabled).toBe(true);
    expect(build({ schemes: jest.fn(() => of([])), aiStatus: jest.fn(() => throwError(() => new Error('down'))) }).aiEnabled).toBe(false);
  });

  it('offers the picker with more than one scheme, and marks concepts stale after an import', () => {
    const component = build({
      schemes: jest.fn(() =>
        of([
          { code: 'meliaf', title: 'MELIAF' },
          { code: 'other', title: 'Other' }
        ])
      ),
      aiStatus: jest.fn(() => of({ enabled: false }))
    });
    component.setSection('import');
    component.onImported();

    expect(component.showSchemePicker).toBe(true);
    expect(component.conceptsReloadToken).toBe(1);
    expect(component.activeSection).toBe('import');
  });
});
