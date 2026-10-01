import { ApiKeyService } from './api-key.service';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { ApiKeyMapper } from './mappers/api-key.mapper';
import { UserData } from '../../shared/interfaces/user-data';
import { API_KEY_SCOPE_VALUES } from './constants/api-key-scopes';

/**
 * `ApiKeyService.update()` — the edit added on 2026-09-24. Instantiated by hand
 * with plain mocks, like `api-key.service.spec.ts`.
 */
describe('ApiKeyService.update', () => {
  const userData = { userId: 42, email: 'admin@cgiar.org' } as UserData;
  const knownScope = API_KEY_SCOPE_VALUES[0];

  let repository: any;
  let misService: any;
  let service: ApiKeyService;
  let stored: any;

  const freshKey = () => ({
    id: 7,
    name: 'Reporting Tool',
    description: 'Old text',
    mis_id: 3,
    scopes: [knownScope],
    allowed_ips: ['10.0.0.1'],
    expires_at: new Date('2030-01-01T00:00:00Z'),
    auditableFields: { is_active: true, updated_by: null },
  });

  beforeEach(() => {
    stored = freshKey();
    repository = {
      findOneBy: jest.fn(async () => stored),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn(async () => stored),
    };
    misService = {
      findOne: jest.fn(async (id) => (id === 9 ? { id: 9 } : null)),
    };
    service = new ApiKeyService(
      repository as ApiKeyRepository,
      new ApiKeyMapper(),
      misService,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('changes only the fields that were sent', async () => {
    await service.update(7, { name: '  Reports  ' }, userData);

    expect(repository.save).toHaveBeenCalledTimes(1);
    const saved = repository.save.mock.calls[0][0];
    expect(saved.name).toBe('Reports');
    expect(saved.description).toBe('Old text');
    expect(saved.mis_id).toBe(3);
    expect(saved.scopes).toEqual([knownScope]);
    expect(saved.auditableFields.updated_by).toBe(42);
  });

  it('clears mis, expiry, scopes and ips when the panel sends them empty', async () => {
    await service.update(
      7,
      {
        description: '',
        mis_id: null,
        scopes: [],
        allowed_ips: [],
        expires_at: '',
      },
      userData,
    );

    const saved = repository.save.mock.calls[0][0];
    expect(saved.description).toBeNull();
    expect(saved.mis_id).toBeNull();
    expect(saved.scopes).toBeNull();
    expect(saved.allowed_ips).toBeNull();
    expect(saved.expires_at).toBeNull();
  });

  it('links an existing MIS and rejects an unknown one', async () => {
    await service.update(7, { mis_id: 9 }, userData);
    expect(repository.save.mock.calls[0][0].mis_id).toBe(9);

    await expect(service.update(7, { mis_id: 99 }, userData)).rejects.toThrow(
      /MIS with ID "99" not found/,
    );
  });

  it('rejects a past expiry and an unknown scope', async () => {
    await expect(
      service.update(7, { expires_at: '2000-01-01T00:00:00Z' }, userData),
    ).rejects.toThrow(/future date/);
    await expect(
      service.update(7, { scopes: ['bogus:scope'] }, userData),
    ).rejects.toThrow();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects an empty name and a revoked key', async () => {
    await expect(service.update(7, { name: '   ' }, userData)).rejects.toThrow(
      /Name cannot be empty/,
    );

    stored.auditableFields.is_active = false;
    await expect(
      service.update(7, { name: 'Anything' }, userData),
    ).rejects.toThrow(/revoked/);
  });

  it('returns the reloaded key as a DTO with the description', async () => {
    const result = await service.update(
      7,
      { description: 'PRMS holds it' },
      userData,
    );
    expect((result as any).response.description).toBe('PRMS holds it');
    expect((result as any).response.id).toBe(7);
  });
});
