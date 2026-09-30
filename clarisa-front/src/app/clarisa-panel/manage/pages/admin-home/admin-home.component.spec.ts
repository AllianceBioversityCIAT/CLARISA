import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { AdminHomeComponent, onlySection } from './admin-home.component';
import { PanelAccessService, PanelAccessState } from '../../../../shared/services/access-admin/panel-access.service';

describe('AdminHomeComponent', () => {
  const build = (state: PanelAccessState, params: Record<string, string> = {}) => {
    const state$ = new BehaviorSubject<PanelAccessState>(state);
    const access = { state$, ensure: jest.fn(), reload: jest.fn() };
    const route = { queryParamMap: new BehaviorSubject(convertToParamMap(params)) };
    const router = { navigate: jest.fn(() => Promise.resolve(true)) };
    const home = new AdminHomeComponent(access as unknown as PanelAccessService, route as unknown as ActivatedRoute, router as unknown as Router);
    home.ngOnInit();
    return { home, access, state$, router };
  };

  const member = (permissions: string[]): PanelAccessState => ({
    status: 'ready',
    access: { userId: 1, email: 'a@b', roles: [], permissions, isSuper: false }
  });

  it('names the section a guard refused, and lists what the roles open (2+ sections)', () => {
    const { home, router } = build(member(['/api/glossary/admin', '/api/institutions/lifecycle/']), { denied: 'Users' });
    expect(home.denied).toBe('Users');
    expect(home.groups.flatMap(group => group.links.map(link => link.label))).toEqual(['Institution lifecycle', 'Glossary']);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(home.loading).toBe(false);
  });

  it('with exactly one section, opens it directly and replaces the history entry (the denied note is dropped)', () => {
    const { home, router } = build(member(['/api/glossary/admin']), { denied: 'Users' });
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/clarisa-panel/manage/glossary-admin'], { queryParams: undefined, replaceUrl: true });
    // The one-card list never flashes while the navigation runs.
    expect(home.loading).toBe(true);
  });

  it('a single section with tabs opens on its first open tab', () => {
    const { router } = build(member(['/api/mises/create']));
    expect(router.navigate).toHaveBeenCalledWith(['/clarisa-panel/manage/microservices-admin'], {
      queryParams: { section: 'mises' },
      replaceUrl: true
    });
  });

  it('navigates once even if the access emits again', () => {
    const { router, state$ } = build(member(['/api/glossary/admin']));
    state$.next(member(['/api/glossary/admin']));
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('shows the list again if that navigation is refused', async () => {
    const state$ = new BehaviorSubject<PanelAccessState>(member(['/api/glossary/admin']));
    const router = { navigate: jest.fn(() => Promise.resolve(false)) };
    const home = new AdminHomeComponent(
      { state$, ensure: jest.fn(), reload: jest.fn() } as unknown as PanelAccessService,
      { queryParamMap: new BehaviorSubject(convertToParamMap({})) } as unknown as ActivatedRoute,
      router as unknown as Router
    );
    home.ngOnInit();
    await Promise.resolve();
    expect(home.redirecting).toBe(false);
    expect(home.loading).toBe(false);
  });

  it('onlySection counts links across groups: 0 and 2 give null, 1 gives the link', () => {
    expect(onlySection([])).toBeNull();
    const a = { label: 'A', route: '/a', icon: '', access: [] };
    const b = { label: 'B', route: '/b', icon: '', access: [] };
    expect(onlySection([{ title: 'x', links: [a] }])).toBe(a);
    expect(onlySection([{ title: 'x', links: [a] }, { title: 'y', links: [b] }])).toBeNull();
  });

  it('tells someone without a role, and retries a failure', () => {
    const { home, access, state$, router } = build({ status: 'ready', access: { userId: 1, email: 'a@b', roles: [], permissions: [], isSuper: false } });
    expect(home.isEmpty).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();

    state$.next({ status: 'error' });
    expect(home.failed).toBe(true);
    home.retry();
    expect(access.reload).toHaveBeenCalled();
  });
});
