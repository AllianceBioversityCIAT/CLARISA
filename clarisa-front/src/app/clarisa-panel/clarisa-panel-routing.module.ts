import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClarisaPanelComponent } from './clarisa-panel.component';

const routes: Routes = [
  {
    path: '',
    component: ClarisaPanelComponent,
    children: [
      {
        path: 'documentation/:nameCategory',
        loadChildren: () =>
          import('./documentation/documentation.module').then(
            (m) => m.DocumentationModule
          ),
      },

      {
        path: 'documentation/:nameCategory/:namesubcategory/:nameEndpoint',
        loadChildren: () =>
          import('./documentation/documentation.module').then(
            (m) => m.DocumentationModule
          ),
      },
      {
        path: 'documentation/:nameCategory/:namesubcategory',
        loadChildren: () =>
          import('./documentation/documentation.module').then(
            (m) => m.DocumentationModule
          ),
      },

      {
        // Dynamic API documentation generated from the back-end OpenAPI spec.
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
