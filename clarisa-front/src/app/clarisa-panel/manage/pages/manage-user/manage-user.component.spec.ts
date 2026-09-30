import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';

// PrimeNG's table bundle does not load under jest here (same stub as
// dynamic-table-filters.component.spec.ts): the p-table is not rendered, so
// the row states are checked through `rows`, and the rest through the DOM.
jest.mock('primeng/table', () => ({ Table: class {}, TableModule: class {} }));

import { ManageUserComponent } from './manage-user.component';
import { AccessAdminApiService, AccessRole, AccessUser, MeAccess, Page } from '../../../../shared/services/access-admin/access-admin-api.service';
import { PanelAccessService } from '../../../../shared/services/access-admin/panel-access.service';

const user = (id: number, roles: AccessUser['roles'] = []): AccessUser => ({
  id,
  firstName: `First${id}`,
  lastName: `Last${id}`,
  email: `u${id}@cgiar.org`,
  isCgiarUser: true,
  lastLogin: '2026-09-20T10:00:00Z',
  isActive: true,
  roles
});

const page = (items: AccessUser[], total = items.length): Page<AccessUser> => ({ items, total, page: 1, pageSize: 20 });

const meliaf: AccessRole = {
  id: 9,
  acronym: 'MELIAF_DA',
  description: 'MELIAF Data Admins',
  level: 'module',
  isSystem: false,
  memberCount: 2,
  permissionIds: [1]
};
const superRole: AccessRole = { ...meliaf, id: 1, acronym: 'SA', description: 'Super admin', level: 'super', isSystem: true, permissionIds: [] };
const superAccess: MeAccess = { userId: 1, email: 'y@cgiar.org', roles: [], permissions: [], isSuper: true };

describe('ManageUserComponent', () => {
  let fixture: ComponentFixture<ManageUserComponent>;
  let component: ManageUserComponent;
  let api: Record<string, jest.Mock>;
  let access: MeAccess | null;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  async function create(users: jest.Mock) {
    api = {
      users,
      roles: jest.fn(() => of([meliaf, superRole])),
      permissions: jest.fn(() => of([{ module: 'MELIAF Taxonomy', items: [{ id: 1, name: '/api/meliaf-taxonomy/admin', label: 'MELIAF', description: null }] }])),
      addMembers: jest.fn(() => of({ added: [1, 2], alreadyMembers: [] })),
      removeMember: jest.fn(() => of({ removed: true }))
    };
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [ManageUserComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: AccessAdminApiService, useValue: api },
        { provide: PanelAccessService, useValue: { resolved: () => of(access) } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ManageUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    access = superAccess;
  });

  it('draws skeleton rows while the first page loads, not a spinner', async () => {
    await create(jest.fn(() => new Subject<Page<AccessUser>>()));
    expect(component.loading).toBe(true);
    expect(component.rows.length).toBe(8);
    expect(component.rows.every(row => component.isSkeleton(row))).toBe(true);
    // No count and no error while loading.
    expect(fixture.nativeElement.querySelector('.admin-table-toolbar__count')).toBeNull();
    expect(text()).not.toContain('did not load');
  });

  it('shows the error with a Retry that loads again', async () => {
    const users = jest.fn(() => throwError(() => new HttpErrorResponse({ status: 0 })));
    await create(users);
    fixture.detectChanges();

    expect(text()).toContain('The users did not load');
    expect(text()).toContain('CLARISA did not answer');
    // pButton draws its label only with ButtonModule, not loaded here: find it by the attribute.
    const retry = fixture.nativeElement.querySelector('.acc-state--error button[label="Retry"]') as HTMLButtonElement;
    retry.click();
    expect(users).toHaveBeenCalledTimes(2);
  });

  it('says nobody matches when filters empty the list, and clears them', async () => {
    await create(jest.fn(() => of(page([]))));
    expect(component.rows).toEqual([]);
    expect(component.hasFilters).toBe(false);
    component.search = 'zzz';
    expect(component.hasFilters).toBe(true);
    component.clearFilters();
    expect(component.search).toBe('');
    expect(api['users']).toHaveBeenLastCalledWith(expect.objectContaining({ search: '', roleId: null, withoutRole: false, page: 1 }));
  });

  it('counts one user and many users in words', async () => {
    await create(jest.fn(() => of(page([user(1, [{ id: 9, acronym: 'MELIAF_DA', description: 'MELIAF Data Admins' }])]))));
    fixture.detectChanges();
    const count = () => (fixture.nativeElement.querySelector('.admin-table-toolbar__count') as HTMLElement).textContent?.trim();
    expect(count()).toBe('1 user');
    expect(component.rows.length).toBe(1);

    api['users'].mockReturnValue(of(page([user(1), user(2)], 57)));
    component.load();
    fixture.detectChanges();
    expect(count()).toBe('57 users');
    expect(component.rows.length).toBe(2);
  });

  it('asks the server for the next page, and filters by «Without role» over the role', async () => {
    await create(jest.fn(() => of(page([user(1)], 90))));
    component.onPage({ first: 40, rows: 20 });
    expect(api['users']).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3, pageSize: 20 }));

    component.roleId = 9;
    component.withoutRole = true;
    component.onWithoutRole();
    expect(component.roleId).toBeNull();
    expect(api['users']).toHaveBeenLastCalledWith(expect.objectContaining({ withoutRole: true, roleId: null, page: 1 }));

    jest.useFakeTimers();
    try {
      component.search = 'ana';
      component.onSearch();
      component.onSearch();
      const calls = api['users'].mock.calls.length;
      jest.advanceTimersByTime(300);
      expect(api['users']).toHaveBeenCalledTimes(calls + 1);
      expect(api['users']).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'ana', page: 1 }));
    } finally {
      jest.useRealTimers();
    }
  });

  it('assigns a role to the selected users in one call, and a second click sends nothing', async () => {
    await create(jest.fn(() => of(page([user(1), user(2)]))));
    const pending = new Subject<{ added: number[]; alreadyMembers: number[] }>();
    api['addMembers'].mockReturnValue(pending);

    component.selection = [component.users[0], component.users[1]];
    fixture.detectChanges();
    expect(text()).toContain('2 users selected');
    component.openAssign();
    component.assignRoleId = 9;
    component.assign();
    component.assign();

    expect(api['addMembers']).toHaveBeenCalledTimes(1);
    expect(api['addMembers']).toHaveBeenCalledWith(9, [1, 2]);
    expect(component.assigning).toBe(true);

    pending.next({ added: [1], alreadyMembers: [2] });
    pending.complete();
    expect(component.assigning).toBe(false);
    expect(component.assignOpen).toBe(false);
    expect(component.selection).toEqual([]);
  });

  it('keeps the dialog open with a human sentence when the back refuses (403)', async () => {
    await create(jest.fn(() => of(page([user(1)]))));
    api['addMembers'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.selection = [component.users[0]];
    component.openAssign();
    component.assignRoleId = 9;
    component.assign();

    expect(component.assignOpen).toBe(true);
    expect(component.assigning).toBe(false);
    expect(component.assignError).toMatch(/Your roles do not allow you to assign the role/);
  });

  it('offers a non-super only the roles inside their own permissions', async () => {
    access = { userId: 5, email: 'm@cgiar.org', roles: [], permissions: ['/api/access-admin', '/api/meliaf-taxonomy/admin'], isSuper: false };
    await create(jest.fn(() => of(page([user(1)]))));
    expect(component.assignable.map(role => role.acronym)).toEqual(['MELIAF_DA']);
  });

  it('removes a role only with a justification, once, and updates the drawer', async () => {
    const held = { id: 9, acronym: 'MELIAF_DA', description: 'MELIAF Data Admins' };
    await create(jest.fn(() => of(page([user(1, [held])]))));
    const pending = new Subject<unknown>();
    api['removeMember'].mockReturnValue(pending);

    component.openUser(component.users[0]);
    component.askRemove(component.users[0], held);
    fixture.detectChanges();

    component.removeRole('Left the MELIAF team');
    component.removeRole('Left the MELIAF team');
    expect(api['removeMember']).toHaveBeenCalledTimes(1);
    expect(api['removeMember']).toHaveBeenCalledWith(9, 1, 'Left the MELIAF team');

    pending.next({ removed: true });
    pending.complete();
    expect(component.removeTarget).toBeNull();
    expect(component.drawerUser?.roles).toEqual([]);
    expect(component.users[0].roles).toEqual([]);
  });

  it('adds a role from the drawer, locked while it travels', async () => {
    await create(jest.fn(() => of(page([user(1)]))));
    const pending = new Subject<unknown>();
    api['addMembers'].mockReturnValue(pending);

    component.openUser(component.users[0]);
    expect(component.addableRoles.map(option => option.value)).toEqual([9, 1]);
    component.addRoleId = 9;
    component.addRole();
    component.addRole();
    expect(api['addMembers']).toHaveBeenCalledTimes(1);
    expect(api['addMembers']).toHaveBeenCalledWith(9, [1]);

    pending.next({ added: [1], alreadyMembers: [] });
    pending.complete();
    expect(component.drawerUser?.roles.map(role => role.acronym)).toEqual(['MELIAF_DA']);
  });
});
