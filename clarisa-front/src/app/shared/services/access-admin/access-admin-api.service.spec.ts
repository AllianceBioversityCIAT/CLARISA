import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AccessAdminApiService, countOf } from './access-admin-api.service';
import { environment } from 'src/environments/environment';

describe('AccessAdminApiService', () => {
  let service: AccessAdminApiService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}api/access-admin`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AccessAdminApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the caller access from users/me/access', () => {
    service.me().subscribe();
    const req = http.expectOne(`${environment.apiUrl}api/users/me/access`);
    expect(req.request.method).toBe('GET');
    req.flush({ userId: 1, email: 'a@b', roles: [], permissions: [], isSuper: false });
  });

  it('lists users with trimmed search, role, page and page size', () => {
    service.users({ search: '  zuniga ', roleId: 7, page: 3, pageSize: 50 }).subscribe();
    const req = http.expectOne(r => r.url === `${base}/users`);
    expect(req.request.params.get('search')).toBe('zuniga');
    expect(req.request.params.get('roleId')).toBe('7');
    expect(req.request.params.get('withoutRole')).toBeNull();
    expect(req.request.params.get('page')).toBe('3');
    expect(req.request.params.get('pageSize')).toBe('50');
    req.flush({ items: [], total: 0, page: 3, pageSize: 50 });
  });

  it('sends withoutRole instead of roleId when both are set, and no empty search', () => {
    service.users({ search: '   ', roleId: 7, withoutRole: true }).subscribe();
    const req = http.expectOne(r => r.url === `${base}/users`);
    expect(req.request.params.get('withoutRole')).toBe('true');
    expect(req.request.params.has('roleId')).toBe(false);
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('20');
    req.flush({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it('creates, patches and sets the permissions of a role on their own routes', () => {
    service.createRole({ acronym: 'MELIAF_DA', description: 'MELIAF Data Admins', permissionIds: [4] }).subscribe();
    const create = http.expectOne(`${base}/roles`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ acronym: 'MELIAF_DA', description: 'MELIAF Data Admins', permissionIds: [4] });
    create.flush({});

    service.updateRole(9, { description: 'New name' }).subscribe();
    const patch = http.expectOne(`${base}/roles/9`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ description: 'New name' });
    patch.flush({});

    service.setRolePermissions(9, [1, 2]).subscribe();
    const put = http.expectOne(`${base}/roles/9/permissions`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ permissionIds: [1, 2] });
    put.flush({});
  });

  it('adds members in bulk and removes one with the justification in the DELETE body', () => {
    service.addMembers(9, [1, 2, 3]).subscribe();
    const add = http.expectOne(`${base}/roles/9/members`);
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toEqual({ userIds: [1, 2, 3] });
    add.flush({ added: [1, 2], alreadyMembers: [3] });

    service.removeMember(9, 2, '  Left the team  ').subscribe();
    const remove = http.expectOne(`${base}/roles/9/members/2`);
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.body).toEqual({ justification: 'Left the team' });
    remove.flush({ removed: true });
  });

  it('lists members with search and page, and the grouped permission catalog', () => {
    service.members(9, { search: 'ana', page: 2, pageSize: 10 }).subscribe();
    const members = http.expectOne(r => r.url === `${base}/roles/9/members`);
    expect(members.request.params.get('search')).toBe('ana');
    expect(members.request.params.get('page')).toBe('2');
    expect(members.request.params.get('pageSize')).toBe('10');
    members.flush({ items: [], total: 0, page: 2, pageSize: 10 });

    service.permissions().subscribe();
    http.expectOne(`${base}/permissions`).flush([]);
  });

  it('counts an outcome given as ids or as a number', () => {
    expect(countOf([4, 5])).toBe(2);
    expect(countOf(3)).toBe(3);
    expect(countOf(undefined)).toBe(0);
  });
});
