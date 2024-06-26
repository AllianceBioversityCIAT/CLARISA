import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PartnerRequestComponent } from './partner-request.component';

const routes: Routes = [
  {
    path: '',
    component: PartnerRequestComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PartnerRequestRoutingModule {}
