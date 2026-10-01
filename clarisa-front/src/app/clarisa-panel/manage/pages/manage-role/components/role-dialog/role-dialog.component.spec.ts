import { SimpleChange } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Subject, of, throwError } from 'rxjs';

import { RoleDialogComponent } from './role-dialog.component';
import { AccessAdminApiService, AccessRole, MeAccess, PermissionGroup } from '../../../../../../shared/services/access-admin/access-admin-api.service';

const catalog: PermissionGroup[] = [
  {
    module: 'Concepts',
    items: [{ id: 1, name: '/api/meliaf-taxonomy/admin', label: 'Manage Concepts', description: 'Create, edit, import and publish.' }]
  },
  { module: 'Glossary', items: [{ id: 2, name: '/api/glossary/admin', label: 'Manage the glossary', description: null }] }
];

const role = (patch: Partial<AccessRole> = {}): AccessRole => ({
  id: 9,
  acronym: 'CONCEPTS_DA',
  description: 'Concepts Data Admins',
  level: 'module',
  isSystem: false,
  memberCount: 0,
  permissionIds: [1],
  ...patch
});

const superAccess: MeAccess = { userId: 1, email: 'y@cgiar.org', roles: [], permissions: [], isSuper: true };

describe('RoleDialogComponent', () => {
  let api: Record<string, jest.Mock>;
  let toast: { add: jest.Mock };

  const open = (edit: AccessRole | null, access: MeAccess | null = superAccess, roles: AccessRole[] = []) => {
    const dialog = new RoleDialogComponent(api as unknown as AccessAdminApiService, toast as unknown as MessageService);
    dialog.role = edit;
    dialog.catalog = catalog;
    dialog.access = access;
    dialog.roles = roles;
    dialog.visible = true;
    dialog.ngOnChanges({ visible: new SimpleChange(false, true, false) });
    return dialog;
  };

  beforeEach(() => {
    api = {
      createRole: jest.fn(() => of(role())),
      updateRole: jest.fn(() => of(role())),
      setRolePermissions: jest.fn(() => of({}))
    };
    toast = { add: jest.fn() };
  });

  it('creates a role once, acronym in capitals, with the ticked permissions', () => {
    const pending = new Subject<AccessRole>();
    api['createRole'].mockReturnValue(pending);
    const dialog = open(null);
    const saved = jest.fn();
    dialog.saved.subscribe(saved);

    dialog.acronym = ' concepts_da ';
    dialog.description = 'Concepts Data Admins';
    dialog.toggle(catalog[0].items[0], true);
    dialog.save();
    dialog.save();

    expect(api['createRole']).toHaveBeenCalledTimes(1);
    expect(api['createRole']).toHaveBeenCalledWith({ acronym: 'CONCEPTS_DA', description: 'Concepts Data Admins', permissionIds: [1] });
    expect(dialog.saving).toBe(true);

    pending.next(role());
    pending.complete();
    expect(saved).toHaveBeenCalled();
    expect(dialog.visible).toBe(false);
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Role created' }));
  });

  it('refuses a malformed or repeated acronym before sending', () => {
    const dialog = open(null, superAccess, [role({ id: 3, acronym: 'CONCEPTS_DA' })]);
    dialog.description = 'Something';
    dialog.acronym = 'has space';
    expect(dialog.acronymError).toMatch(/without spaces/);
    dialog.acronym = 'concepts_da';
    expect(dialog.acronymError).toMatch(/already uses/);
    dialog.save();
    expect(api['createRole']).not.toHaveBeenCalled();
  });

  it('on edit sends only what changed: the name by PATCH, the permissions by PUT', () => {
    const dialog = open(role());
    expect(dialog.canSave).toBe(false);

    dialog.description = 'Concepts Data Administrators';
    dialog.toggle(catalog[1].items[0], true);
    dialog.save();

    expect(api['updateRole']).toHaveBeenCalledWith(9, { description: 'Concepts Data Administrators' });
    expect(api['setRolePermissions']).toHaveBeenCalledWith(9, [1, 2]);
    expect(api['createRole']).not.toHaveBeenCalled();
  });

  it('opens a system role read-only and never saves it', () => {
    const dialog = open(role({ isSystem: true, acronym: 'SA', level: 'super' }));
    expect(dialog.readOnly).toBe(true);
    expect(dialog.lockedReason).toMatch(/System role/);

    dialog.description = 'changed';
    dialog.toggle(catalog[1].items[0], true);
    dialog.save();
    expect(dialog.selected.has(2)).toBe(false);
    expect(api['updateRole']).not.toHaveBeenCalled();
  });

  it('lets a non-super tick only permissions they hold, and locks roles beyond them', () => {
    const admin: MeAccess = { userId: 2, email: 'm@cgiar.org', roles: [], permissions: ['/api/access-admin', '/api/meliaf-taxonomy/admin'], isSuper: false };
    const dialog = open(null, admin);
    expect(dialog.canGrant(catalog[0].items[0])).toBe(true);
    expect(dialog.canGrant(catalog[1].items[0])).toBe(false);
    dialog.toggle(catalog[1].items[0], true);
    expect(dialog.selected.has(2)).toBe(false);

    expect(open(role({ permissionIds: [1, 2] }), admin).lockedReason).toMatch(/permissions you do not have/);
    expect(open(role({ permissionIds: [1] }), admin).readOnly).toBe(false);
  });

  it('keeps the dialog open with the reason when the back says 409', () => {
    api['createRole'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Acronym already in use' } })));
    const dialog = open(null);
    dialog.acronym = 'NEW_ROLE';
    dialog.description = 'New role';
    dialog.save();

    expect(dialog.visible).toBe(true);
    expect(dialog.saving).toBe(false);
    expect(dialog.error).toBe('Could not create the role: it conflicts with the current data (Acronym already in use).');
  });

  it('selects and clears a whole module group', () => {
    const dialog = open(null);
    dialog.toggleGroup(catalog[1]);
    expect(dialog.countIn(catalog[1])).toBe(1);
    expect(dialog.groupAllOn(catalog[1])).toBe(true);
    dialog.toggleGroup(catalog[1]);
    expect(dialog.countIn(catalog[1])).toBe(0);
  });
});
