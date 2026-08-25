import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GlossaryAdminComponent } from './glossary-admin.component';

const routes: Routes = [
  {
    path: '',
    component: GlossaryAdminComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GlossaryAdminRoutingModule {}
