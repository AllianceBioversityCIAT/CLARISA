import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ManageRoutingModule } from './manage-routing.module';
import { ManageComponent } from './manage.component';
import { HorizontalMenuComponent } from './components/horizontal-menu/horizontal-menu.component';
import { AdminSidebarComponent } from './components/admin-sidebar/admin-sidebar.component';

@NgModule({
  declarations: [ManageComponent, HorizontalMenuComponent, AdminSidebarComponent],
  imports: [CommonModule, ManageRoutingModule]
})
export class ManageModule {}
