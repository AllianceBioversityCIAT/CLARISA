import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ControlListsAdminComponent } from './control-lists-admin.component';
import { ListsScreenComponent } from './lists-screen/lists-screen.component';
import { ListWorkspaceComponent } from './list-workspace/list-workspace.component';

const routes: Routes = [
  {
    path: '',
    component: ControlListsAdminComponent,
    children: [
      { path: '', component: ListsScreenComponent },
      { path: ':id', component: ListWorkspaceComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ControlListsAdminRoutingModule {}
