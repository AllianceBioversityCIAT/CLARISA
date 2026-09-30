import { NgModule } from '@angular/core';

import { ManageRoleRoutingModule } from './manage-role-routing.module';
import { ManageRoleComponent } from './manage-role.component';
import { RoleDialogComponent } from './components/role-dialog/role-dialog.component';
import { RoleMembersComponent } from './components/role-members/role-members.component';
import { AccessSharedModule } from '../../components/access/access-shared.module';

@NgModule({
  declarations: [ManageRoleComponent, RoleDialogComponent, RoleMembersComponent],
  imports: [AccessSharedModule, ManageRoleRoutingModule]
})
export class ManageRoleModule {}
