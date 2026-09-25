import { Test, TestingModule } from '@nestjs/testing';
import { MisService } from './mis.service';
import { MisRepository } from './repositories/mis.repository';
import { EnvironmentService } from '../environment/environment.service';
import { UserService } from '../user/user.service';
import { MisMapper } from './mappers/mis.mapper';

/**
 * Logical delete of a MIS (`setActive`, 2026-09-24): the row stays, only
 * `is_active` flips, and reactivating re-checks the acronym+environment rule.
 */
describe('MisService.setActive', () => {
  let service: MisService;
  const userData = { userId: 42, email: 'admin@cgiar.org' } as any;

  const repository: any = {
    findOne: jest.fn(),
    save: jest.fn(async (entity) => entity),
  };

  const mis = () => ({
    id: 5,
    acronym: 'MEL',
    name: 'Monitoring, Evaluation and Learning',
    environment_object: { acronym: 'TEST' },
    auditableFields: { is_active: true, updated_by: null },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MisService,
        { provide: MisRepository, useValue: repository },
        { provide: EnvironmentService, useValue: {} },
        { provide: UserService, useValue: {} },
        {
          provide: MisMapper,
          useValue: {
            classToSimpleDto: jest.fn((m) => ({
              id: m.id,
              acronym: m.acronym,
            })),
          },
        },
      ],
    }).compile();
    service = module.get(MisService);
  });

  it('deactivates without deleting: same row, is_active false, updated_by set', async () => {
    const stored = mis();
    repository.findOne.mockResolvedValueOnce(stored);

    const result = await service.setActive(5, false, userData);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 5,
        auditableFields: expect.objectContaining({
          is_active: false,
          updated_by: 42,
        }),
      }),
    );
    expect((result as any).response).toEqual({
      id: 5,
      acronym: 'MEL',
      is_active: false,
    });
  });

  it('reactivates when no other active MIS holds the acronym in that environment', async () => {
    const stored = {
      ...mis(),
      auditableFields: { is_active: false, updated_by: null },
    };
    repository.findOne
      .mockResolvedValueOnce(stored) // load
      .mockResolvedValueOnce(stored); // uniqueness check finds itself

    await service.setActive(5, true, userData);

    expect(repository.save.mock.calls[0][0].auditableFields.is_active).toBe(
      true,
    );
  });

  it('refuses to reactivate over another active MIS with the same acronym', async () => {
    const stored = {
      ...mis(),
      auditableFields: { is_active: false, updated_by: null },
    };
    repository.findOne
      .mockResolvedValueOnce(stored)
      .mockResolvedValueOnce({ ...mis(), id: 9 });

    await expect(service.setActive(5, true, userData)).rejects.toThrow(
      /already exists/,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('fails clearly on an unknown id', async () => {
    repository.findOne.mockResolvedValueOnce(null);
    await expect(service.setActive(404, false, userData)).rejects.toThrow(
      /MIS with ID "404" not found/,
    );
  });
});
