import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ApiReferenceComponent } from './api-reference.component';

const routes: Routes = [
  // `/clarisa-panel/api-reference` shows the whole catalog;
  // `/clarisa-panel/api-reference/:group` narrows it to one group.
  { path: '', component: ApiReferenceComponent },
  { path: ':group', component: ApiReferenceComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ApiReferenceRoutingModule {}
