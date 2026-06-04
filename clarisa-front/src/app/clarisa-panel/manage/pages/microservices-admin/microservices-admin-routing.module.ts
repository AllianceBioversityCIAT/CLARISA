import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MicroservicesAdminComponent } from './microservices-admin.component';

const routes: Routes = [
  {
    path: '',
    component: MicroservicesAdminComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MicroservicesAdminRoutingModule {}
