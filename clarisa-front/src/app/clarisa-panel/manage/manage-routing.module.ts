import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManageComponent } from './manage.component';
import { LoginGuardGuard } from '../../shared/services/login-guard.guard';
import { AdminAccessGuard } from './admin-access.guard';
import { MELIAF_TAXONOMY_HIDDEN } from '../../shared/feature-flags/meliaf-taxonomy';
import { HIDDEN_CONCEPTS_ADMIN_ROUTES } from '../../shared/feature-flags/meliaf-taxonomy.routes';

/**
 * Every screen passes two guards: a usable session (`LoginGuardGuard`), then
 * the caller's roles (`AdminAccessGuard`, same map as the sidebar).
 */
const guarded = [LoginGuardGuard, AdminAccessGuard];

/**
 * `meliafHidden` (`MELIAF_TAXONOMY_HIDDEN`): `concepts-admin` and
 * `global-concepts-admin` redirect to the panel home and the MELIAF taxonomy
 * module is never loaded. A redirect, not only a hidden menu entry:
 * `AdminAccessGuard` opens any URL that has no entry in the nav.
 */
export function conceptsAdminRoutes(meliafHidden: boolean): Routes {
  return meliafHidden
    ? HIDDEN_CONCEPTS_ADMIN_ROUTES
    : [
        {
          path: 'global-concepts-admin',
          redirectTo: 'concepts-admin',
          pathMatch: 'full',
        },
        {
          path: 'concepts-admin',
          loadChildren: () =>
            import(
              './pages/global-concepts-admin/global-concepts-admin.module'
            ).then((m) => m.GlobalConceptsAdminModule),
          canActivate: guarded,
        },
      ];
}

export const MANAGE_ROUTES: Routes = [
  {
    path: '',
    component: ManageComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadChildren: () => import('./pages/admin-home/admin-home.module').then(m => m.AdminHomeModule),
        canActivate: [LoginGuardGuard],
      },
      {
        path: 'manage-user',
        loadChildren: () =>
          import('./pages/manage-user/manage-user.module').then(
            (m) => m.ManageUserModule
          ),
        canActivate: guarded,
      },
      {
        path: 'manage-role',
        loadChildren: () =>
          import('./pages/manage-role/manage-role.module').then(
            (m) => m.ManageRoleModule
          ),
        canActivate: guarded,
      },
      {
        path: 'partner-request',
        loadChildren: () =>
          import('./pages/partner-request/partner-request.module').then(
            (m) => m.PartnerRequestModule
          ),
        canActivate: guarded,
      },
      {
        path: 'microservices-admin',
        loadChildren: () =>
          import('./pages/microservices-admin/microservices-admin.module').then(
            (m) => m.MicroservicesAdminModule
          ),
        canActivate: guarded,
      },
      {
        path: 'institution-lifecycle',
        loadChildren: () =>
          import(
            './pages/institution-lifecycle/institution-lifecycle.module'
          ).then((m) => m.InstitutionLifecycleModule),
        canActivate: guarded,
      },
      {
        path: 'parameters',
        loadChildren: () =>
          import('./pages/parameters/parameters.module').then(
            (m) => m.ParametersModule
          ),
        canActivate: guarded,
      },
      {
        path: 'glossary-admin',
        loadChildren: () =>
          import('./pages/glossary-admin/glossary-admin.module').then(
            (m) => m.GlossaryAdminModule
          ),
        canActivate: guarded,
      },
      ...conceptsAdminRoutes(MELIAF_TAXONOMY_HIDDEN),
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(MANAGE_ROUTES)],
  exports: [RouterModule],
})
export class ManageRoutingModule {}
