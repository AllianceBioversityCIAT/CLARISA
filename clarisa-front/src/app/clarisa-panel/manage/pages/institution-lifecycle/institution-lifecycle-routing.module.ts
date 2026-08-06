import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InstitutionLifecycleComponent } from './institution-lifecycle.component';

const routes: Routes = [
  {
    path: '',
    component: InstitutionLifecycleComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InstitutionLifecycleRoutingModule {}
