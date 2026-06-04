import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManageComponent } from './manage.component';
import { LoginGuardGuard } from '../../shared/services/login-guard.guard';

const routes: Routes = [
  {
    path: '',
    component: ManageComponent,
    children: [
      {
        path: 'manage-user',
        loadChildren: () =>
          import('./pages/manage-user/manage-user.module').then(
            (m) => m.ManageUserModule
          ),
      },
      {
        path: 'manage-role',
        loadChildren: () =>
          import('./pages/manage-role/manage-role.module').then(
            (m) => m.ManageRoleModule
          ),
      },
      {
        path: 'partner-request',
        loadChildren: () =>
          import('./pages/partner-request/partner-request.module').then(
            (m) => m.PartnerRequestModule
          ),
        canActivate: [LoginGuardGuard],
      },
      {
        path: 'microservices-admin',
        loadChildren: () =>
          import('./pages/microservices-admin/microservices-admin.module').then(
            (m) => m.MicroservicesAdminModule
          ),
        canActivate: [LoginGuardGuard],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManageRoutingModule {}
