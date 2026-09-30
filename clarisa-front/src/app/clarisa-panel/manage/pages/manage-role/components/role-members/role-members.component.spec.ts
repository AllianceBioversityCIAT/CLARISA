import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Subject, of, throwError } from 'rxjs';

import { RoleMembersComponent } from './role-members.component';
import { AccessAdminApiService, AccessRole, AccessUser } from '../../../../../../shared/services/access-admin/access-admin-api.service';

const role: AccessRole = { id: 9, acronym: 'CONCEPTS_DA', description: 'Concepts Data Admins', level: 'module', isSystem: false, memberCount: 1, permissionIds: [1] };
const member: AccessUser = { id: 4, firstName: 'Ana', lastName: 'Ruiz', email: 'a@cgiar.org', isCgiarUser: true, lastLogin: null, isActive: true, roles: [] };

describe('RoleMembersComponent', () => {
  let api: Record<string, jest.Mock>;
  let toast: { add: jest.Mock };

  const build = (readOnly = false) => {
    const members = new RoleMembersComponent(api as unknown as AccessAdminApiService, toast as unknown as MessageService);
    members.role = role;
    members.readOnly = readOnly;
    members.ngOnInit();
    return members;
  };

  beforeEach(() => {
    api = {
      members: jest.fn(() => of({ items: [member], total: 1, page: 1, pageSize: 10 })),
      addMembers: jest.fn(() => of({ added: [5, 6], alreadyMembers: [] })),
      removeMember: jest.fn(() => of({ removed: true }))
    };
    toast = { add: jest.fn() };
  });

  it('loads the first page of members with the search', () => {
    const members = build();
    expect(api['members']).toHaveBeenCalledWith(9, { search: '', page: 1, pageSize: 10 });
    expect(members.rows).toEqual([member]);
  });

  it('adds the picked people in one call, even on a double tap', () => {
    const pending = new Subject<unknown>();
    api['addMembers'].mockReturnValue(pending);
    const members = build();
    const changed = jest.fn();
    members.changed.subscribe(changed);

    members.picked = [{ ...member, id: 5, display: 'A' }, { ...member, id: 6, display: 'B' }];
    members.add();
    members.add();
    expect(api['addMembers']).toHaveBeenCalledTimes(1);
    expect(api['addMembers']).toHaveBeenCalledWith(9, [5, 6]);

    pending.next({ added: [5, 6], alreadyMembers: [] });
    pending.complete();
    expect(members.picked).toEqual([]);
    expect(changed).toHaveBeenCalled();
  });

  it('removes with the justification, once, and maps a 409 to a sentence', () => {
    const members = build();
    members.askRemove(member);
    api['removeMember'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'The last Super admin cannot be removed' } })));
    members.remove('Left the team');
    expect(members.removeError).toMatch(/conflicts with the current data \(The last Super admin cannot be removed\)/);
    expect(members.removeTarget).toBe(member);

    api['removeMember'].mockReturnValue(of({ removed: true }));
    members.remove('Left the team');
    expect(api['removeMember']).toHaveBeenLastCalledWith(9, 4, 'Left the team');
    expect(members.removeTarget).toBeNull();
  });

  it('does nothing on a read-only role', () => {
    const members = build(true);
    members.picked = [{ ...member, display: 'A' }];
    members.add();
    members.askRemove(member);
    expect(api['addMembers']).not.toHaveBeenCalled();
    expect(members.removeTarget).toBeNull();
  });
});
