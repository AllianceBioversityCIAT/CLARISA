import { NgModule } from '@angular/core';

import { ManageUserRoutingModule } from './manage-user-routing.module';
import { ManageUserComponent } from './manage-user.component';
import { AccessSharedModule } from '../../components/access/access-shared.module';

@NgModule({
  declarations: [ManageUserComponent],
  imports: [AccessSharedModule, ManageUserRoutingModule]
})
export class ManageUserModule {}
