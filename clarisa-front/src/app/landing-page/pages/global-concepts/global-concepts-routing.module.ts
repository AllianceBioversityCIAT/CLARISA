import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConceptListComponent } from './pages/concept-list/concept-list.component';
import { ConceptDetailComponent } from './pages/concept-detail/concept-detail.component';
import { RequestVerifyComponent } from './pages/request-verify/request-verify.component';
import { RequestFollowComponent } from './pages/request-follow/request-follow.component';
import { DevelopersComponent } from './pages/developers/developers.component';
import { GuideComponent } from './pages/guide/guide.component';

/**
 * 🛑 The `requests/*` routes go BEFORE `:scheme/:termId`: both are two
 * segments, and in the other order `requests/verify` would open as the concept
 * "verify" of a scheme called "requests". The paths match the links the back
 * emails (`GlobalConceptsConfig.webBase` + `/requests/verify?token=` and
 * `/requests/:id?token=`).
 */
const routes: Routes = [
  { path: '', component: ConceptListComponent },
  { path: 'developers', component: DevelopersComponent },
  { path: 'guide', component: GuideComponent },
  { path: 'requests/verify', component: RequestVerifyComponent },
  { path: 'requests/:id', component: RequestFollowComponent },
  { path: ':scheme/:termId', component: ConceptDetailComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GlobalConceptsRoutingModule {}
