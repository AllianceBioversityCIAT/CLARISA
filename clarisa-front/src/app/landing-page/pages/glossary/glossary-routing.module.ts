import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GlossaryComponent } from './glossary.component';

const routes: Routes = [
  {
    path: '',
    component: GlossaryComponent
  },
  // Permalink of one entry. The same page, focused on that term: the SKOS URI
  // `glossary/term/:termId` redirects here from the root router.
  {
    path: 'term/:termId',
    component: GlossaryComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GlossaryRoutingModule {}
