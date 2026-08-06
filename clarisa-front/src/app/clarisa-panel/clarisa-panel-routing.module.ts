import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClarisaPanelComponent } from './clarisa-panel.component';

const routes: Routes = [
  {
    path: '',
    component: ClarisaPanelComponent,
    children: [
      {
        // The public documentation keeps the URL hierarchy it has always had —
        // `documentation/<group>/<category>/<endpoint>` — so every link already
        // shared, and the legacy swagger redirects in routes-clarisa-legacy.ts,
        // keep resolving. Only the renderer changed: these paths now serve the
        // API Reference view instead of the old DocumentationModule, which
        // stays in the codebase as reference but is no longer routed.
        path: 'documentation',
        loadChildren: () =>
          import('./api-reference/api-reference.module').then(
            (m) => m.ApiReferenceModule
          ),
      },
      {
        // Same view without naming a group: shows the whole catalog.
        path: 'api-reference',
        loadChildren: () =>
          import('./api-reference/api-reference.module').then(
            (m) => m.ApiReferenceModule
          ),
      },
      {
        path: 'manage',
        loadChildren: () =>
          import('./manage/manage.module').then((m) => m.ManageModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClarisaPanelRoutingModule {}
