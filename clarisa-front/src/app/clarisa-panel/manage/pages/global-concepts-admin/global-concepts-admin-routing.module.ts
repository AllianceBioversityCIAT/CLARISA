import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GlobalConceptsAdminComponent } from './global-concepts-admin.component';

const routes: Routes = [
  {
    path: '',
    component: GlobalConceptsAdminComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GlobalConceptsAdminRoutingModule {}
