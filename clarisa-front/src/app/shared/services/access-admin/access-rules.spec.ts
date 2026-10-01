import { HttpErrorResponse } from '@angular/common/http';
import { AccessRole, MeAccess, PermissionGroup } from './access-admin-api.service';
import { accessErrorMessage, assignableRoles, fullName, holdsPermission, permits } from './access-rules';

const catalog: PermissionGroup[] = [
  {
    module: 'Concepts',
    items: [{ id: 1, name: '/api/meliaf-taxonomy/admin', label: 'Manage Concepts', description: null }]
  },
  { module: 'Glossary', items: [{ id: 2, name: '/api/glossary/admin', label: 'Manage the glossary', description: null }] },
  { module: 'Access', items: [{ id: 3, name: '/api/access-admin', label: 'Manage roles and users', description: null }] }
];

const role = (id: number, permissionIds: number[], level: AccessRole['level'] = 'module'): AccessRole => ({
  id,
  acronym: `R${id}`,
  description: `Role ${id}`,
  level,
  isSystem: false,
  memberCount: 0,
  permissionIds
});

const me = (permissions: string[], isSuper = false): MeAccess => ({ userId: 1, email: 'a@b', roles: [], permissions, isSuper });

describe('access rules', () => {
  it('permits a route the way the back PermissionGuard does (route contains the permission)', () => {
    expect(permits('/api/glossary/admin/terms', ['/api/glossary/admin'])).toBe(true);
    expect(permits('/api/glossary/admin/terms', ['/api/institutions'])).toBe(false);
    expect(permits('/api/glossary/admin/terms', ['', null as unknown as string])).toBe(false);
    expect(permits('/api/glossary/admin/terms', undefined)).toBe(false);
  });

  it('lets a super assign every active role', () => {
    const roles = [role(1, [1]), role(2, [2], 'super'), { ...role(3, [3]), isActive: false }];
    expect(assignableRoles(roles, me([], true), catalog).map(r => r.id)).toEqual([1, 2]);
  });

  it('lets anyone else assign only roles inside their own permissions, never super', () => {
    const roles = [role(1, [1]), role(2, [1, 2]), role(3, [1], 'super'), role(4, [])];
    const admin = me(['/api/access-admin', '/api/meliaf-taxonomy/admin']);
    expect(assignableRoles(roles, admin, catalog).map(r => r.id)).toEqual([1, 4]);
    expect(assignableRoles(roles, null, catalog)).toEqual([]);
  });

  it('tells who holds a permission', () => {
    expect(holdsPermission('/api/glossary/admin', me(['/api/glossary/admin']))).toBe(true);
    expect(holdsPermission('/api/glossary/admin', me([]))).toBe(false);
    expect(holdsPermission('/api/glossary/admin', me([], true))).toBe(true);
    expect(holdsPermission('/api/glossary/admin', null)).toBe(false);
  });

  it('names a person, falling back to the e-mail', () => {
    expect(fullName({ firstName: 'Ana', lastName: 'Ruiz', email: 'a@b' })).toBe('Ana Ruiz');
    expect(fullName({ firstName: null, lastName: null, email: 'a@b' })).toBe('a@b');
  });

  it('turns 403, 409, 400 and a network failure into sentences', () => {
    const err = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

    expect(accessErrorMessage(err(403), 'assign the role')).toMatch(/^Your roles do not allow you to assign the role\. .*Super admin/);
    expect(accessErrorMessage(err(409, { message: 'The last Super admin cannot be removed' }), 'remove the role')).toBe(
      'Could not remove the role: it conflicts with the current data (The last Super admin cannot be removed).'
    );
    expect(accessErrorMessage(err(400, { message: ['acronym must be 2 to 50 letters', 'description too short'] }), 'create the role')).toBe(
      'Could not create the role: some of the data was not accepted (acronym must be 2 to 50 letters; description too short).'
    );
    expect(accessErrorMessage(err(0), 'load the users')).toMatch(/did not answer/);
    expect(accessErrorMessage(err(500, { description: 'boom' }), 'load the users')).toMatch(/HTTP 500/);
  });
});
