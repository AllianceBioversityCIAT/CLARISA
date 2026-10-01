// LDAPAuth reads src/shared/config/config.ts, which is git-ignored and absent in CI;
// these suites never authenticate against the directory (same mock as auth.service.spec).
jest.mock('../../auth/utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));

import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { apiRoutes } from '../api.routes';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyModule } from './api-key.module';
import { ApiKeyValidateController } from './api-key-validate.controller';

const proto = ApiKeyController.prototype as unknown as Record<string, object>;
const handlers = Object.getOwnPropertyNames(ApiKeyController.prototype).filter(
  (name) =>
    name !== 'constructor' &&
    Reflect.getMetadata(METHOD_METADATA, proto[name]) !== undefined,
);

describe('ApiKeyController wiring', () => {
  it('is mounted at api/api-keys', () => {
    expect(apiRoutes).toContainEqual({
      path: 'api-keys',
      module: ApiKeyModule,
    });
  });

  it('guards the whole controller with JwtAuthGuard + PermissionGuard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ApiKeyController)).toEqual([
      JwtAuthGuard,
      PermissionGuard,
    ]);
  });

  it('has every route it had, and none declares its own guards (the class ones apply to all)', () => {
    const routes = handlers.map((name) => [
      name,
      Reflect.getMetadata(PATH_METADATA, proto[name]),
      Reflect.getMetadata(METHOD_METADATA, proto[name]),
    ]);
    expect(routes).toEqual([
      ['create', 'create', RequestMethod.POST],
      ['findAll', '/', RequestMethod.GET],
      ['listScopes', 'scopes', RequestMethod.GET],
      ['getUsageSummary', 'usage/summary', RequestMethod.GET],
      ['getUsageLogs', 'usage/logs', RequestMethod.GET],
      ['getUsageByEndpoint', 'usage/endpoints', RequestMethod.GET],
      ['getUsageOverview', 'usage/overview', RequestMethod.GET],
      ['getMisActivity', 'usage/mis-activity', RequestMethod.GET],
      ['getKeyUsage', ':id/usage', RequestMethod.GET],
      ['findOne', 'get/:id', RequestMethod.GET],
      ['update', ':id', RequestMethod.PATCH],
      ['revoke', ':id/revoke', RequestMethod.PATCH],
      ['rotate', ':id/rotate', RequestMethod.PATCH],
      ['remove', ':id', RequestMethod.DELETE],
    ]);
    handlers.forEach((name) =>
      expect(Reflect.getMetadata(GUARDS_METADATA, proto[name])).toBeUndefined(),
    );
  });

  it('leaves the external validate-api-key endpoint without PermissionGuard', () => {
    const vproto = ApiKeyValidateController.prototype as unknown as Record<
      string,
      object
    >;
    const guards = [
      ...(Reflect.getMetadata(GUARDS_METADATA, ApiKeyValidateController) ?? []),
      ...Object.getOwnPropertyNames(ApiKeyValidateController.prototype).flatMap(
        (name) =>
          name === 'constructor'
            ? []
            : (Reflect.getMetadata(GUARDS_METADATA, vproto[name]) ?? []),
      ),
    ];
    expect(guards).not.toContain(PermissionGuard);
  });
});
