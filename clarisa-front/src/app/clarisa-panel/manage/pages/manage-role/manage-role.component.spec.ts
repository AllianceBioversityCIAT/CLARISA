import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { ManageRoleComponent } from './manage-role.component';
import { AccessAdminApiService } from '../../../../shared/services/access-admin/access-admin-api.service';
import { PanelAccessService } from '../../../../shared/services/access-admin/panel-access.service';

describe('ManageRoleComponent', () => {
  const build = (api: Partial<Record<'roles' | 'permissions', jest.Mock>>) => {
    const component = new ManageRoleComponent(api as unknown as AccessAdminApiService, { resolved: () => of(null) } as unknown as PanelAccessService);
    component.ngOnInit();
    return component;
  };

  it('loads roles with the permission catalog and sorts Level by its words', () => {
    const component = build({
      roles: jest.fn(() => of([{ id: 1, acronym: 'SA', description: 'Super admin', level: 'super', isSystem: true, memberCount: 3, permissionIds: [] }])),
      permissions: jest.fn(() => of([]))
    });
    expect(component.loading).toBe(false);
    expect(component.roles[0].levelText).toBe('Super admin');
    expect(component.rows).toEqual(component.roles);
  });

  it('shows the error in words and retries', () => {
    const roles = jest.fn(() => throwError(() => new HttpErrorResponse({ status: 403 })));
    const component = build({ roles, permissions: jest.fn(() => of([])) });
    expect(component.loadError).toMatch(/Your roles do not allow you to load the roles/);
    component.load();
    expect(roles).toHaveBeenCalledTimes(2);
  });

  it('opens the dialog empty for a new role and filled for an existing one', () => {
    const component = build({ roles: jest.fn(() => of([])), permissions: jest.fn(() => of([])) });
    component.openNew();
    expect(component.dialogOpen).toBe(true);
    expect(component.editing).toBeNull();
  });
});
