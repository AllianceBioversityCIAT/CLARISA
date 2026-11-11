import { NgModule } from '@angular/core';
import { Route, RouterModule, Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page.component';
import { MELIAF_TAXONOMY_HIDDEN } from '../shared/feature-flags/meliaf-taxonomy';
import { HIDDEN_PUBLIC_CONCEPTS_ROUTES } from '../shared/feature-flags/meliaf-taxonomy.routes';

/**
 * `meliafHidden` (`MELIAF_TAXONOMY_HIDDEN`): `concepts` only redirects to the
 * glossary and the MELIAF taxonomy module is never loaded. The legacy
 * `global-concepts*` addresses keep sending to `concepts`, which then
 * redirects (a concept detail lands on its glossary term).
 */
export function conceptsRoute(meliafHidden: boolean): Route {
  return meliafHidden
    ? { path: 'concepts', children: HIDDEN_PUBLIC_CONCEPTS_ROUTES }
    : {
        path: 'concepts',
        loadChildren: () =>
          import('./pages/global-concepts/global-concepts.module').then(
            (m) => m.GlobalConceptsModule
          ),
      };
}

export const LANDING_PAGE_ROUTES: Routes = [
  {
    path: '',
    component: LandingPageComponent,
    children: [
      {
        path: 'home',
        loadChildren: () =>
          import('./pages/home/home.module').then((m) => m.HomeModule),
      },
      {
        redirectTo: 'home',
        path: '',
        pathMatch: 'full',
      },
      {
        path: 'dashboards',
        loadChildren: () =>
          import('./pages/dashboards/dashboards.module').then(
            (m) => m.DashboardsModule
          ),
      },
      {
        path: 'api-services',
        loadChildren: () =>
          import('./pages/api-services/api-services.module').then(
            (m) => m.ApiServicesModule
          ),
      },
      {
        path: 'faq',
        loadChildren: () =>
          import('./pages/faq/faq.module').then((m) => m.FaqModule),
      },
      {
        path: 'glossary',
        loadChildren: () =>
          import('./pages/glossary/glossary.module').then(
            (m) => m.GlossaryModule
          ),
      },
      conceptsRoute(MELIAF_TAXONOMY_HIDDEN),
      // Old address of the section (links in e-mails and bookmarks) → new one.
      { path: 'global-concepts', redirectTo: 'concepts', pathMatch: 'full' },
      { path: 'global-concepts/:a', redirectTo: 'concepts/:a' },
      { path: 'global-concepts/:a/:b', redirectTo: 'concepts/:a/:b' },
      {
        path: 'institutionsRequestBi',
        loadChildren: () =>
          import(
            './pages/institutions-request-bi/institutions-request-bi.module'
          ).then((m) => m.InstitutionsRequestBIModule),
      },
      {
        path: 'contact-us',
        loadChildren: () =>
          import('./pages/contact-us/contact-us.module').then(
            (m) => m.ContactUsModule
          ),
      },
      {
        path: 'login',
        loadChildren: () =>
          import('./pages/login/login.module').then((m) => m.LoginModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(LANDING_PAGE_ROUTES)],
  exports: [RouterModule],
})
export class LandingPageRoutingModule {}
