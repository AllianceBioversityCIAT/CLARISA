import { ExecutionContext } from '@nestjs/common';
import { HybridAuthorizationGuard } from './hybrid-authorization.guard';
import { PermissionGuard } from './permission.guard';
import { API_KEY_AUTH_CONTEXT_KEY } from '../../api/api-key/constants/api-key-auth.constants';

describe('HybridAuthorizationGuard', () => {
  const permissionGuardMock = {
    canActivate: jest.fn(),
  };

  const guard = new HybridAuthorizationGuard(
    permissionGuardMock as unknown as PermissionGuard,
  );

  const buildContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows API-key requests without calling PermissionGuard', async () => {
    const request = {
      [API_KEY_AUTH_CONTEXT_KEY]: {
        api_key_id: 1,
        key_prefix: 'cl_prod_abcdefgh',
      },
    };

    const result = await guard.canActivate(buildContext(request));

    expect(result).toBe(true);
    expect(permissionGuardMock.canActivate).not.toHaveBeenCalled();
  });

  it('delegates JWT requests to PermissionGuard', async () => {
    permissionGuardMock.canActivate.mockResolvedValue(true);
    const request = { user: { email: 'user@cgiar.org' } };

    const result = await guard.canActivate(buildContext(request));

    expect(result).toBe(true);
    expect(permissionGuardMock.canActivate).toHaveBeenCalledTimes(1);
  });
});
