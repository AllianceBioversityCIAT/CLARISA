import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'landing-page',
    loadChildren: () =>
      import('./landing-page/landing-page.module').then(
        (m) => m.LandingPageModule
      ),
  },
  // The persistent SKOS URI of a glossary term,
  // `https://clarisa.cgiar.org/glossary/term/{termId}`, has to resolve.
  {
    path: 'glossary/term/:termId',
    redirectTo: 'landing-page/glossary/term/:termId',
  },
  {
    redirectTo: 'landing-page',
    path: '',
    pathMatch: 'full',
  },

  {
    path: 'clarisa-panel',
    loadChildren: () =>
      import('./clarisa-panel/clarisa-panel.module').then(
        (m) => m.ClarisaPanelModule
      ),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
