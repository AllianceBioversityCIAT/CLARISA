import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { AdminHomeComponent } from './admin-home.component';
import { PanelAccessService, PanelAccessState } from '../../../../shared/services/access-admin/panel-access.service';

describe('AdminHomeComponent', () => {
  const build = (state: PanelAccessState, params: Record<string, string> = {}) => {
    const state$ = new BehaviorSubject<PanelAccessState>(state);
    const access = { state$, ensure: jest.fn(), reload: jest.fn() };
    const route = { queryParamMap: new BehaviorSubject(convertToParamMap(params)) };
    const home = new AdminHomeComponent(access as unknown as PanelAccessService, route as unknown as ActivatedRoute);
    home.ngOnInit();
    return { home, access, state$ };
  };

  it('names the section a guard refused, and lists what the roles open', () => {
    const { home } = build(
      { status: 'ready', access: { userId: 1, email: 'a@b', roles: [], permissions: ['/api/glossary/admin'], isSuper: false } },
      { denied: 'Users' }
    );
    expect(home.denied).toBe('Users');
    expect(home.groups.flatMap(group => group.links.map(link => link.label))).toEqual(['Glossary']);
  });

  it('tells someone without a role, and retries a failure', () => {
    const { home, access, state$ } = build({ status: 'ready', access: { userId: 1, email: 'a@b', roles: [], permissions: [], isSuper: false } });
    expect(home.isEmpty).toBe(true);

    state$.next({ status: 'error' });
    expect(home.failed).toBe(true);
    home.retry();
    expect(access.reload).toHaveBeenCalled();
  });
});
