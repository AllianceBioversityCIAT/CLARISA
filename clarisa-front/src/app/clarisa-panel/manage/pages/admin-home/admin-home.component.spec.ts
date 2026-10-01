import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { AdminHomeComponent } from './admin-home.component';
import { PanelAccessService, PanelAccessState } from '../../../../shared/services/access-admin/panel-access.service';
import * as nav from '../../admin-nav';

describe('AdminHomeComponent', () => {
  const build = (state: PanelAccessState, params: Record<string, string> = {}, navigateOk = true) => {
    const state$ = new BehaviorSubject<PanelAccessState>(state);
    const access = { state$, ensure: jest.fn(), reload: jest.fn() };
    const route = { queryParamMap: new BehaviorSubject(convertToParamMap(params)) };
    const router = { navigate: jest.fn(() => Promise.resolve(navigateOk)) };
    const home = new AdminHomeComponent(access as unknown as PanelAccessService, route as unknown as ActivatedRoute, router as unknown as Router);
    home.ngOnInit();
    return { home, access, state$, router };
  };

  const member = (permissions: string[]): PanelAccessState => ({
    status: 'ready',
    access: { userId: 1, email: 'a@b', roles: [], permissions, isSuper: false }
  });
  const labels = (home: AdminHomeComponent) => home.groups.flatMap(group => group.links.map(link => link.label));
  const allLabels = nav.ADMIN_GROUPS.flatMap(group => group.links.map(link => link.label));

  it('names the section a guard refused, and lists only what the roles open (2 sections)', () => {
    const { home, router } = build(member(['/api/glossary/admin', '/api/institutions/lifecycle/']), { denied: 'Users' });
    expect(home.denied).toBe('Users');
    expect(labels(home)).toEqual(['Institution lifecycle', 'Glossary']);
    expect(home.isEmpty).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(home.loading).toBe(false);
  });

  it('tells a user without any role that none is assigned yet, and does not redirect', () => {
    const { home, router } = build(member([]), { denied: 'Institution requests' });
    expect(labels(home)).toEqual([]);
    expect(home.isEmpty).toBe(true);
    expect(home.denied).toBe('Institution requests');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(home.loading).toBe(false);
  });

  it('never shows the no-role note while loading or when the access failed', () => {
    const { home, state$ } = build({ status: 'loading' });
    expect(home.isEmpty).toBe(false);
    state$.next({ status: 'error' });
    expect(home.isEmpty).toBe(false);
  });

  it('sends an institution requester (create only) straight to Institution requests', () => {
    const { router } = build(member(['/api/partner-requests/create']));
    expect(router.navigate).toHaveBeenCalledWith(['/clarisa-panel/manage/partner-request'], { queryParams: undefined, replaceUrl: true });
  });

  it('sends a Concepts-only member straight to Concepts, replacing the history entry (denied note dropped)', () => {
    const { home, router } = build(member(['/api/meliaf-taxonomy/admin']), { denied: 'Users' });
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/clarisa-panel/manage/concepts-admin'], { queryParams: undefined, replaceUrl: true });
    // The list never flashes while the navigation runs.
    expect(home.loading).toBe(true);
  });

  it('a single protected tab opens its section on that tab', () => {
    const { router } = build(member(['/api/mises/create']));
    expect(router.navigate).toHaveBeenCalledWith(['/clarisa-panel/manage/microservices-admin'], {
      queryParams: { section: 'mises' },
      replaceUrl: true
    });
  });

  it('shows a super the whole panel, without redirecting', () => {
    const { home, router } = build({ status: 'ready', access: { userId: 1, email: 'a@b', roles: [], permissions: [], isSuper: true } });
    expect(labels(home)).toEqual(allLabels);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('lists the whole panel when me/access failed or timed out, and does not redirect', () => {
    const { home, router, state$ } = build({ status: 'loading' });
    expect(home.loading).toBe(true);
    expect(home.groups).toEqual([]);

    state$.next({ status: 'error' });
    expect(labels(home)).toEqual(allLabels);
    expect(home.loading).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('navigates once even if the access emits again', () => {
    const { router, state$ } = build(member(['/api/glossary/admin']));
    state$.next(member(['/api/glossary/admin']));
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('shows the list again if that navigation is refused', async () => {
    const { home } = build(member(['/api/glossary/admin']), {}, false);
    await Promise.resolve();
    expect(home.redirecting).toBe(false);
    expect(home.loading).toBe(false);
    expect(labels(home)).toEqual(['Glossary']);
  });
});
