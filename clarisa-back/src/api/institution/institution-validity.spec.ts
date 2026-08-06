import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { InstitutionRepository } from './repositories/institution.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ValidityStatusOptions } from '../../shared/entities/enums/validity-status-options';
import { InstitutionLineageRelationType } from './entities/institution-lineage.entity';

/**
 * Contract tests for the institution validity period and lineage.
 *
 * The point of this file is regression, not coverage: the whole change is only
 * safe as long as the default response stays byte-identical for a caller that
 * asks for nothing, and as long as lifecycle fields cannot travel through the
 * unauthenticated bulk-edit endpoint.
 */
describe('Institution validity and lineage', () => {
  let service: InstitutionService;

  const repositoryMock: any = {
    findInstitutions: jest.fn().mockResolvedValue([]),
    findAllInstitutionsSimple: jest.fn().mockResolvedValue([]),
    findInstitutionById: jest.fn().mockResolvedValue(null),
    findInstitutionSimpleById: jest.fn().mockResolvedValue(null),
    updateLifecycle: jest.fn().mockResolvedValue({ code: 221 }),
    save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionService,
        { provide: InstitutionRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = module.get<InstitutionService>(InstitutionService);
  });

  describe('status query parameter', () => {
    it('defaults to showing every institution, so today callers see no change', async () => {
      await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);

      expect(repositoryMock.findInstitutions).toHaveBeenCalledWith(
        FindAllOptions.SHOW_ONLY_ACTIVE,
        undefined,
        undefined,
        ValidityStatusOptions.SHOW_ALL,
      );
    });

    it.each([
      ValidityStatusOptions.SHOW_ALL,
      ValidityStatusOptions.SHOW_ONLY_ACTIVE,
      ValidityStatusOptions.SHOW_ONLY_ENDED,
    ])('forwards the %s filter to the repository', async (status) => {
      await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE, undefined, status);

      expect(repositoryMock.findInstitutions).toHaveBeenCalledWith(
        FindAllOptions.SHOW_ONLY_ACTIVE,
        undefined,
        undefined,
        status,
      );
    });

    it('rejects an unknown value instead of silently ignoring it', async () => {
      // A consumer that misspells the filter must not get a full list while
      // believing it was filtered.
      await expect(
        service.findAll(
          FindAllOptions.SHOW_ONLY_ACTIVE,
          undefined,
          'activo' as ValidityStatusOptions,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repositoryMock.findInstitutions).not.toHaveBeenCalled();
    });

    it('still rejects an unknown show option', async () => {
      await expect(service.findAll('nope' as FindAllOptions)).rejects.toThrow();
    });
  });

  describe('lifecycle fields cannot travel through the bulk-edit endpoint', () => {
    it.each([
      'start_date',
      'end_date',
      'startDate',
      'endDate',
      'replacedBy',
      'replaces',
      'outgoing_lineages',
      'incoming_lineages',
    ])('strips %s from the update payload', async (field) => {
      await service.update([
        { id: 221, name: 'X', [field]: 'anything' },
      ] as any);

      const [saved] = repositoryMock.save.mock.calls[0];
      expect(saved[0]).not.toHaveProperty(field);
    });

    it('keeps the legitimate fields untouched', async () => {
      await service.update([
        { id: 221, name: 'CGIAR System Organization', acronym: 'SMO' },
      ] as any);

      const [saved] = repositoryMock.save.mock.calls[0];
      expect(saved[0]).toEqual({
        id: 221,
        name: 'CGIAR System Organization',
        acronym: 'SMO',
      });
    });

    it('survives an empty or missing payload', async () => {
      await expect(service.update(undefined as any)).resolves.toBeDefined();
      await expect(service.update([])).resolves.toBeDefined();
    });
  });

  describe('lifecycle management', () => {
    it('passes the acting user through so the change is auditable', async () => {
      const dto = {
        endDate: '2025-12-31',
        replacedByInstitutionId: 9876,
        relationType: InstitutionLineageRelationType.RENAME,
        note: 'Acronym changed from SMO to SO. Same organisation, renamed.',
      };

      await service.updateLifecycle(221, dto, 4372);

      expect(repositoryMock.updateLifecycle).toHaveBeenCalledWith(
        221,
        dto,
        4372,
      );
    });
  });

  describe('relation type vocabulary', () => {
    it('is frozen to the one already in production for global units', () => {
      // Diverging here would leave two sibling lineage tables speaking
      // different dialects, and PRMS would launder any unknown value into
      // 'NEW' anyway. A rename is stored as 'NEW' on purpose.
      expect(Object.values(InstitutionLineageRelationType)).toEqual([
        'MERGE',
        'SPLIT',
        'SUCCESSOR',
        'NEW',
      ]);
      expect(InstitutionLineageRelationType.RENAME).toBe('NEW');
    });
  });
});
