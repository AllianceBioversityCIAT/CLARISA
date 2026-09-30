import { Observable, of, throwError } from 'rxjs';
import { GlobalConceptsApiService } from '../../../../shared/services/global-concepts/global-concepts-api.service';
import { PanelAccessService } from '../../../../shared/services/access-admin/panel-access.service';
import { MeAccess } from '../../../../shared/services/access-admin/access-admin-api.service';
import { GlobalConceptsAdminComponent, isMeliafFullAdmin } from './global-concepts-admin.component';

const who = (permissions: string[], isSuper = false): MeAccess => ({ userId: 1, email: 'x@clarisa.test', roles: [], permissions, isSuper });
const FULL = who(['/api/meliaf-taxonomy/admin']);
const CONCEPTS_ONLY = who(['/api/meliaf-taxonomy/admin/meliaf/concepts']);

describe('GlobalConceptsAdminComponent', () => {
  const build = (api: Partial<Record<'schemes' | 'aiStatus', jest.Mock>>, access: MeAccess | null | Observable<MeAccess | null> = FULL) => {
    const panelAccess = { resolved: jest.fn(() => (access instanceof Observable ? access : of(access))) };
    const component = new GlobalConceptsAdminComponent(api as unknown as GlobalConceptsApiService, panelAccess as unknown as PanelAccessService);
    component.ngOnInit();
    return component;
  };
  const quiet = () => ({ schemes: jest.fn(() => of([])), aiStatus: jest.fn(() => of({ enabled: false })) });

  describe('tabs by permission', () => {
    const ids = (component: GlobalConceptsAdminComponent) => component.sections.map(section => section.id);

    it('a super and a full MELIAF admin see the five tabs', () => {
      expect(ids(build(quiet(), who([], true)))).toEqual(['concepts', 'requests', 'import', 'setup', 'usage']);
      expect(ids(build(quiet(), FULL))).toEqual(['concepts', 'requests', 'import', 'setup', 'usage']);
    });

    it('a concepts-only member (MELIAF_CE) sees just Concepts and cannot switch to another tab', () => {
      const component = build(quiet(), CONCEPTS_ONLY);
      expect(ids(component)).toEqual(['concepts']);
      component.setSection('setup');
      component.setSection('import');
      expect(component.activeSection).toBe('concepts');
    });

    it('no access (or an access that failed) shows only Concepts', () => {
      expect(ids(build(quiet(), null))).toEqual(['concepts']);
      expect(ids(build(quiet(), who(['/api/glossary/admin'])))).toEqual(['concepts']);
    });

    it('keeps the editor working for a concepts-only member when ai/status answers 403', () => {
      const component = build({ schemes: jest.fn(() => of([])), aiStatus: jest.fn(() => throwError(() => ({ status: 403 }))) }, CONCEPTS_ONLY);
      expect(component.aiEnabled).toBe(false);
      expect(component.activeSection).toBe('concepts');
    });

    it('decides full admin with the same substring test as the back', () => {
      expect(isMeliafFullAdmin(FULL)).toBe(true);
      expect(isMeliafFullAdmin(who([], true))).toBe(true);
      expect(isMeliafFullAdmin(CONCEPTS_ONLY)).toBe(false);
      expect(isMeliafFullAdmin(who(['/api/meliaf-taxonomy/admin/meliaf/lists']))).toBe(false);
      expect(isMeliafFullAdmin(null)).toBe(false);
    });
  });

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

  it('lists the five sections and opens Concepts with a create request from Usage', () => {
    const component = build({ schemes: jest.fn(() => of([])), aiStatus: jest.fn(() => of({ enabled: false })) });
    expect(component.sections.map(section => section.id)).toEqual(['concepts', 'requests', 'import', 'setup', 'usage']);

    component.setSection('usage');
    component.createFromSearch('theory of change');
    component.createFromSearch('theory of change');

    expect(component.activeSection).toBe('concepts');
    expect(component.createRequest).toEqual({ label: 'theory of change', token: 2 });
  });

  it('clears the create request once the concepts panel used it, and never repeats a token', () => {
    const component = build({ schemes: jest.fn(() => of([])), aiStatus: jest.fn(() => of({ enabled: false })) });
    component.createFromSearch('theory of change');
    component.onCreateHandled(1);
    expect(component.createRequest).toBeNull();

    // An older answer never clears a newer request.
    component.createFromSearch('impact pathway');
    component.onCreateHandled(1);
    expect(component.createRequest).toEqual({ label: 'impact pathway', token: 2 });
  });
});
