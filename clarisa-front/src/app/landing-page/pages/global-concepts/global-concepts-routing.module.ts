import { Injectable, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterModule, Routes, UrlTree } from '@angular/router';
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
/**
 * A scheme URI (`/concepts/{scheme}`) and shared links such as
 * `/landing-page/concepts/meliaf` land on one segment; the list reads the
 * scheme from `?scheme=`, so send that address to it instead of the wildcard.
 */
@Injectable({ providedIn: 'root' })
export class SchemeSegmentRedirectGuard implements CanActivate {
  constructor(private readonly _router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): UrlTree {
    return this._router.createUrlTree(['/landing-page/concepts'], {
      queryParams: { ...route.queryParams, scheme: route.paramMap.get('scheme') }
    });
  }
}

const routes: Routes = [
  { path: '', component: ConceptListComponent },
  { path: 'developers', component: DevelopersComponent },
  { path: 'guide', component: GuideComponent },
  { path: 'requests/verify', component: RequestVerifyComponent },
  { path: 'requests/:id', component: RequestFollowComponent },
  { path: ':scheme/:termId', component: ConceptDetailComponent },
  { path: ':scheme', component: ConceptListComponent, canActivate: [SchemeSegmentRedirectGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GlobalConceptsRoutingModule {}
