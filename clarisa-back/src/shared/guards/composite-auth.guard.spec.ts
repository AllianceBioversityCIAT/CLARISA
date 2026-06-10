import { ExecutionContext } from '@nestjs/common';
import { CompositeAuthGuard } from './composite-auth.guard';
import { ApiKeyGuard } from './api-key.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('CompositeAuthGuard', () => {
  const apiKeyGuardMock = {
    canActivate: jest.fn(),
  };

  const jwtAuthGuardMock = {
    canActivate: jest.fn(),
  };

  const guard = new CompositeAuthGuard(
    apiKeyGuardMock as unknown as ApiKeyGuard,
    jwtAuthGuardMock as unknown as JwtAuthGuard,
  );

  const buildContext = (headers: Record<string, string>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to ApiKeyGuard when X-API-Key is present', async () => {
    apiKeyGuardMock.canActivate.mockResolvedValue(true);

    const result = await guard.canActivate(
      buildContext({ 'x-api-key': 'cl_prod_secretkeyvalue' }),
    );

    expect(result).toBe(true);
    expect(apiKeyGuardMock.canActivate).toHaveBeenCalledTimes(1);
    expect(jwtAuthGuardMock.canActivate).not.toHaveBeenCalled();
  });

  it('delegates to JwtAuthGuard when X-API-Key is missing', async () => {
    jwtAuthGuardMock.canActivate.mockResolvedValue(true);

    const result = await guard.canActivate(buildContext({}));

    expect(result).toBe(true);
    expect(jwtAuthGuardMock.canActivate).toHaveBeenCalledTimes(1);
    expect(apiKeyGuardMock.canActivate).not.toHaveBeenCalled();
  });

  it('falls back to JwtAuthGuard when X-API-Key is blank', async () => {
    jwtAuthGuardMock.canActivate.mockResolvedValue(true);

    await guard.canActivate(buildContext({ 'x-api-key': '   ' }));

    expect(jwtAuthGuardMock.canActivate).toHaveBeenCalledTimes(1);
    expect(apiKeyGuardMock.canActivate).not.toHaveBeenCalled();
  });
});
