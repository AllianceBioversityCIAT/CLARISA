import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyValidateController } from './api-key-validate.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyValidateRateLimitGuard } from './guards/api-key-validate-rate-limit.guard';

describe('ApiKeyValidateController', () => {
  let controller: ApiKeyValidateController;

  const apiKeyServiceMock = {
    validate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyValidateController],
      providers: [{ provide: ApiKeyService, useValue: apiKeyServiceMock }],
    })
      .overrideGuard(ApiKeyValidateRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(ApiKeyValidateController);
  });

  it('returns public response without internal fields', async () => {
    apiKeyServiceMock.validate.mockResolvedValue({
      valid: true,
      api_key_id: 1,
      key_prefix: 'cl_prod_abcdefgh',
      environment: 'PROD',
      scopes: ['institutions:read'],
      mis: { id: 2, name: 'PRMS', acronym: 'PRMS' },
    });

    const response = await controller.validateApiKey(
      {
        api_key: 'cl_prod_abcdefghijklmnop',
        microservice_name: 'ms',
        endpoint_accessed: '/x',
      },
      {
        method: 'POST',
        headers: {},
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as any,
    );

    expect(response).toEqual({
      valid: true,
      environment: 'PROD',
      scopes: ['institutions:read'],
      mis: { id: 2, name: 'PRMS', acronym: 'PRMS' },
    });
    expect(response).not.toHaveProperty('api_key_id');
    expect(response).not.toHaveProperty('key_prefix');
  });

  it('throws UnauthorizedException when validation fails', async () => {
    apiKeyServiceMock.validate.mockResolvedValue({
      valid: false,
      error: 'Invalid API key',
    });

    await expect(
      controller.validateApiKey(
        {
          api_key: 'cl_prod_abcdefghijklmnop',
          microservice_name: 'ms',
          endpoint_accessed: '/x',
        },
        {
          method: 'POST',
          headers: {},
          ip: '127.0.0.1',
          socket: { remoteAddress: '127.0.0.1' },
        } as any,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
