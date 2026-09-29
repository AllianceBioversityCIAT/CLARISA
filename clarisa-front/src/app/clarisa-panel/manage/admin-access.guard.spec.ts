import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Observable, of } from 'rxjs';

import { AdminAccessGuard } from './admin-access.guard';
import { PanelAccessService } from '../../shared/services/access-admin/panel-access.service';
import { MeAccess } from '../../shared/services/access-admin/access-admin-api.service';

describe('AdminAccessGuard', () => {
  let resolved: MeAccess | null;
  let guard: AdminAccessGuard;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: PanelAccessService, useValue: { resolved: () => of(resolved) } }]
    });
    guard = TestBed.inject(AdminAccessGuard);
    router = TestBed.inject(Router);
  });

  const run = (url: string): boolean | UrlTree => {
    let result: boolean | UrlTree = false;
    (guard.canActivate({} as never, { url } as RouterStateSnapshot) as Observable<boolean | UrlTree>).subscribe(value => (result = value));
    return result;
  };

  it('lets in whoever the sidebar would show the entry to', () => {
    resolved = { userId: 1, email: 'a@b', roles: [], permissions: ['/api/glossary/admin'], isSuper: false };
    expect(run('/clarisa-panel/manage/glossary-admin')).toBe(true);
  });

  it('lets a super in anywhere', () => {
    resolved = { userId: 1, email: 'a@b', roles: [], permissions: [], isSuper: true };
    expect(run('/clarisa-panel/manage/manage-role')).toBe(true);
  });

  it('sends anyone else to the panel home, naming the section', () => {
    resolved = { userId: 1, email: 'a@b', roles: [], permissions: ['/api/glossary/admin'], isSuper: false };
    const result = run('/clarisa-panel/manage/manage-user');
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/clarisa-panel/manage?denied=Users');
  });

  it('says so when the access could not be read', () => {
    resolved = null;
    expect(router.serializeUrl(run('/clarisa-panel/manage/partner-request') as UrlTree)).toBe('/clarisa-panel/manage?denied=error');
  });
});
