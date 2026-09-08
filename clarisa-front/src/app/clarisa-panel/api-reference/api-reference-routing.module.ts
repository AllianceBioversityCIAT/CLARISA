import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ApiReferenceComponent } from './api-reference.component';

/**
 * Mirrors the documentation hierarchy that has always been public:
 *
 *   /clarisa-panel/documentation
 *   /clarisa-panel/documentation/<group>
 *   /clarisa-panel/documentation/<group>/<category>
 *   /clarisa-panel/documentation/<group>/<category>/<endpoint>
 *
 * Segment names are the display names with spaces replaced by underscores,
 * e.g. `One_CGIAR_Control_List/Institutions/Institutions_List`.
 */
const routes: Routes = [
  { path: '', component: ApiReferenceComponent },
  { path: ':group', component: ApiReferenceComponent },
  { path: ':group/:category', component: ApiReferenceComponent },
  { path: ':group/:category/:endpoint', component: ApiReferenceComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ApiReferenceRoutingModule {}
