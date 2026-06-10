import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ApiReferenceComponent } from './api-reference.component';

const routes: Routes = [{ path: '', component: ApiReferenceComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ApiReferenceRoutingModule {}
