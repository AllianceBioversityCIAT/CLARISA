import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'bi/:reportName',
    loadComponent: () => import('./pages/bi/bi.component')
  },
  {
    path: 'bi/:reportName/:event',
    loadComponent: () => import('./pages/bi/bi.component')
  },
  {
    path: 'bi-list',
    loadComponent: () => import('./pages/bi-list/bi-list.component')
  },
  {
    path: '**',
    redirectTo: 'bi-list',
    pathMatch: 'full'
  }
];
