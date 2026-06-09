import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from '../../api/api-key/api-key.service';
import { API_KEY_AUTH_CONTEXT_KEY } from '../../api/api-key/constants/api-key-auth.constants';

describe('ApiKeyGuard', () => {
  const apiKeyServiceMock = {
    validate: jest.fn(),
  };

  const reflectorMock = {
    get: jest.fn(),
  };

  const guard = new ApiKeyGuard(
    apiKeyServiceMock as unknown as ApiKeyService,
    reflectorMock as unknown as Reflector,
  );

  const buildContext = (headers: Record<string, string>): ExecutionContext => {
    const request = {
      headers,
      method: 'GET',
      originalUrl: '/api/institutions',
      url: '/api/institutions',
      ip: '10.0.0.1',
      socket: { remoteAddress: '10.0.0.1' },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reflectorMock.get.mockReturnValue(undefined);
  });

  it('rejects requests without X-API-Key', async () => {
    await expect(guard.canActivate(buildContext({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches auth context on successful validation', async () => {
    apiKeyServiceMock.validate.mockResolvedValue({
      valid: true,
      api_key_id: 9,
      key_prefix: 'cl_prod_abcdefgh',
      environment: 'PROD',
      scopes: ['institutions:read'],
      mis: { id: 3, name: 'PRMS', acronym: 'PRMS' },
    });

    const context = buildContext({ 'x-api-key': 'cl_prod_secretkeyvalue' });
    const request = context.switchToHttp().getRequest();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request[API_KEY_AUTH_CONTEXT_KEY]).toEqual({
      api_key_id: 9,
      key_prefix: 'cl_prod_abcdefgh',
      mis_id: 3,
      mis: { id: 3, name: 'PRMS', acronym: 'PRMS' },
      environment: 'PROD',
      scopes: ['institutions:read'],
    });
  });
});
