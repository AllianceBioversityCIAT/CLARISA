import { Routes } from '@nestjs/core';
import { ApiModule } from './api/api.module';
import { apiRoutes } from './api/api.routes';
import { AuthModule } from './auth/auth.module';
import { authRoutes } from './auth/auth.routes';
import { IntegrationModule } from './integration/integration.module';
import { integrationRoutes } from './integration/integration.routes';
import { GlobalConceptsUriModule } from './api/global-concepts/global-concepts.module';

export const routes: Routes = [
  {
    path: 'api',
    module: ApiModule,
    children: apiRoutes,
  },
  {
    path: 'auth',
    module: AuthModule,
    children: authRoutes,
  },
  {
    path: 'integration',
    module: IntegrationModule,
    children: integrationRoutes,
  },
  {
    path: 'concepts',
    module: GlobalConceptsUriModule,
  },
];
