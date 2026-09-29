import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManageComponent } from './manage.component';
import { LoginGuardGuard } from '../../shared/services/login-guard.guard';
import { AdminAccessGuard } from './admin-access.guard';

/**
 * Every screen passes two guards: a usable session (`LoginGuardGuard`), then
 * the caller's roles (`AdminAccessGuard`, same map as the sidebar).
 */
const guarded = [LoginGuardGuard, AdminAccessGuard];

const routes: Routes = [
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
        path: 'glossary-admin',
        loadChildren: () =>
          import('./pages/glossary-admin/glossary-admin.module').then(
            (m) => m.GlossaryAdminModule
          ),
        canActivate: guarded,
      },
      {
        path: 'global-concepts-admin',
        loadChildren: () =>
          import(
            './pages/global-concepts-admin/global-concepts-admin.module'
          ).then((m) => m.GlobalConceptsAdminModule),
        canActivate: guarded,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManageRoutingModule {}
