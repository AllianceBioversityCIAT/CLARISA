import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyService } from './api-key.service';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { ApiKeyMapper } from './mappers/api-key.mapper';
import { MisService } from '../mis/mis.service';
import { EnvironmentService } from '../environment/environment.service';
import { BCryptPasswordEncoder } from '../../auth/utils/BCryptPasswordEncoder';
import { ApiKeyUsageLogService } from './api-key-usage-log.service';
import { ApiKey } from './entities/api-key.entity';

describe('ApiKeyService.validate', () => {
  let service: ApiKeyService;

  const plainKey = 'cl_prod_abcdefghijklmnop';
  const keyPrefix = plainKey.slice(0, 16);

  const getMany = jest.fn<Promise<ApiKey[]>, []>();
  const queryBuilder = {
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany,
  };

  const apiKeyRepositoryMock = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  };

  const bcryptMock = {
    matches: jest.fn(),
    encode: jest.fn(),
  };

  const usageLogServiceMock = {
    touchKeyUsage: jest.fn().mockResolvedValue(undefined),
    recordUsageAsync: jest.fn(),
  };

  const baseDto = {
    api_key: plainKey,
    microservice_name: 'test-ms',
    endpoint_accessed: '/some/path',
  };

  const activeKey = (): ApiKey =>
    ({
      id: 42,
      key_prefix: keyPrefix,
      key_hash: 'hashed',
      scopes: ['institutions:read', 'email:send'],
      allowed_ips: null,
      expires_at: null,
      auditableFields: { is_active: true },
      environment_object: { acronym: 'PROD' },
      mis_object: { id: 7, name: 'PRMS', acronym: 'PRMS' },
    }) as ApiKey;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        { provide: ApiKeyRepository, useValue: apiKeyRepositoryMock },
        { provide: ApiKeyMapper, useValue: {} },
        { provide: MisService, useValue: {} },
        { provide: EnvironmentService, useValue: {} },
        { provide: BCryptPasswordEncoder, useValue: bcryptMock },
        { provide: ApiKeyUsageLogService, useValue: usageLogServiceMock },
      ],
    }).compile();

    service = module.get(ApiKeyService);
  });

  it('rejects missing api_key', async () => {
    const result = await service.validate({
      ...baseDto,
      api_key: '   ',
    });

    expect(result).toEqual({ valid: false, error: 'Missing api_key' });
    expect(apiKeyRepositoryMock.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects keys shorter than prefix length', async () => {
    const result = await service.validate({
      ...baseDto,
      api_key: 'cl_prod_short',
    });

    expect(result).toEqual({ valid: false, error: 'Invalid API key format' });
  });

  it('rejects unknown keys', async () => {
    getMany.mockResolvedValue([]);
    bcryptMock.matches.mockReturnValue(false);

    const result = await service.validate(baseDto);

    expect(result).toEqual({ valid: false, error: 'Invalid API key' });
    expect(usageLogServiceMock.touchKeyUsage).not.toHaveBeenCalled();
  });

  it('rejects revoked keys', async () => {
    const key = activeKey();
    key.auditableFields.is_active = false;
    getMany.mockResolvedValue([key]);
    bcryptMock.matches.mockReturnValue(true);

    const result = await service.validate(baseDto);

    expect(result).toEqual({ valid: false, error: 'API key is revoked' });
  });

  it('rejects expired keys', async () => {
    const key = activeKey();
    key.expires_at = new Date('2020-01-01');
    getMany.mockResolvedValue([key]);
    bcryptMock.matches.mockReturnValue(true);

    const result = await service.validate(baseDto);

    expect(result).toEqual({ valid: false, error: 'API key has expired' });
  });

  it('rejects disallowed client IPs', async () => {
    const key = activeKey();
    key.allowed_ips = ['192.168.1.10'];
    getMany.mockResolvedValue([key]);
    bcryptMock.matches.mockReturnValue(true);

    const result = await service.validate({
      ...baseDto,
      ip_address: '10.0.0.5',
    });

    expect(result).toEqual({
      valid: false,
      error: 'IP address is not allowed for this key',
    });
  });

  it('rejects missing required scope', async () => {
    getMany.mockResolvedValue([activeKey()]);
    bcryptMock.matches.mockReturnValue(true);

    const result = await service.validate({
      ...baseDto,
      required_scope: 'institutions:write',
    });

    expect(result).toEqual({
      valid: false,
      error: 'Missing required scope: institutions:write',
    });
  });

  it('returns success payload and records usage', async () => {
    getMany.mockResolvedValue([activeKey()]);
    bcryptMock.matches.mockReturnValue(true);

    const result = await service.validate(
      { ...baseDto, required_scope: 'institutions:read' },
      { clientIp: '10.0.0.1', httpMethod: 'POST', userAgent: 'jest' },
    );

    expect(result).toEqual({
      valid: true,
      api_key_id: 42,
      key_prefix: keyPrefix,
      environment: 'PROD',
      scopes: ['institutions:read', 'email:send'],
      mis: { id: 7, name: 'PRMS', acronym: 'PRMS' },
    });
    expect(usageLogServiceMock.touchKeyUsage).toHaveBeenCalledWith(42);
    expect(usageLogServiceMock.recordUsageAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        api_key_id: 42,
        microservice_name: 'test-ms',
        endpoint_accessed: '/some/path',
        http_method: 'POST',
        ip_address: '10.0.0.1',
        status_code: 200,
      }),
    );
  });
});
