import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ManageRoutingModule } from './manage-routing.module';
import { ManageComponent } from './manage.component';
import { HorizontalMenuComponent } from './components/horizontal-menu/horizontal-menu.component';
import { AdminSidebarComponent } from './components/admin-sidebar/admin-sidebar.component';

@NgModule({
  declarations: [ManageComponent, HorizontalMenuComponent, AdminSidebarComponent],
  // `FormsModule` por el buscador del sidebar, que es el único `ngModel` de este
  // módulo: filtra la navegación en memoria, no habla con nadie.
  imports: [CommonModule, FormsModule, ManageRoutingModule]
})
export class ManageModule {}
