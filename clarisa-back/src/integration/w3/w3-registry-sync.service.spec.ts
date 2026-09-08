import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { W3RegistryApi } from './w3-registry.api';
import {
  W3RegistrySyncService,
  toMappingStatus,
} from './w3-registry-sync.service';
import { W3RegistryMappingDto } from './dto/w3-registry-project.dto';
import { Project } from '../../api/project/entity/project.entity';
import { ProjectMapping } from '../../api/project/entity/project-mapping.entity';
import { CgiarEntity } from '../../api/cgiar-entity/entities/cgiar-entity.entity';
import { AuditableEntity } from '../../shared/entities/extends/auditable-entity.entity';

describe('W3RegistrySyncService', () => {
  describe('toMappingStatus', () => {
    it("maps 'agreed' to Confirmed, trimming and ignoring case", () => {
      expect(toMappingStatus('agreed')).toBe('Confirmed');
      expect(toMappingStatus(' Agreed ')).toBe('Confirmed');
      expect(toMappingStatus('AGREED')).toBe('Confirmed');
    });

    it('keeps anything else as Pending', () => {
      expect(toMappingStatus('proposed')).toBe('Pending');
      expect(toMappingStatus('rejected')).toBe('Pending');
      expect(toMappingStatus('some other text')).toBe('Pending');
      expect(toMappingStatus('')).toBe('Pending');
      expect(toMappingStatus(undefined)).toBe('Pending');
      expect(toMappingStatus(null)).toBe('Pending');
    });
  });

  describe('syncMappings', () => {
    let service: W3RegistrySyncService;

    const program = { id: 42, smo_code: 'SP01' } as CgiarEntity;
    const project = { id: 7 } as Project;

    const mappingRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const cgiarEntityRepository = {
      findOne: jest.fn(),
    };
    const manager: any = {
      getRepository: jest.fn((entity) => {
        if (entity === ProjectMapping) return mappingRepository;
        if (entity === CgiarEntity) return cgiarEntityRepository;
        throw new Error(`Unexpected repository ${entity?.name}`);
      }),
    };

    const sourceMapping = (
      overrides: Partial<W3RegistryMappingDto> = {},
    ): W3RegistryMappingDto => ({
      programCode: 'SP01',
      programName: 'Breeding for Tomorrow',
      efficiencyRating: 'high',
      allocationPercentage: 50,
      complementarityRating: 'medium',
      ...overrides,
    });

    const runSync = (
      mappings: W3RegistryMappingDto[],
      existing: ProjectMapping[] = [],
    ) => {
      mappingRepository.find.mockResolvedValue(existing);
      mappingRepository.create.mockImplementation(
        (partial: Partial<ProjectMapping>) =>
          Object.assign(new ProjectMapping(), partial),
      );
      mappingRepository.save.mockImplementation(async (row) => row);
      cgiarEntityRepository.findOne.mockResolvedValue(program);
      const warnings: string[] = [];
      return (service as any)
        .syncMappings(manager, project, mappings, warnings)
        .then(() => warnings);
    };

    const savedMapping = (): ProjectMapping =>
      mappingRepository.save.mock.calls[0][0] as ProjectMapping;

    beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          W3RegistrySyncService,
          { provide: W3RegistryApi, useValue: {} },
          { provide: DataSource, useValue: {} },
        ],
      }).compile();

      service = module.get<W3RegistrySyncService>(W3RegistrySyncService);
    });

    it("stores Confirmed when the registry mapping is 'agreed'", async () => {
      await runSync([sourceMapping({ status: 'agreed' })]);

      expect(mappingRepository.save).toHaveBeenCalledTimes(1);
      expect(savedMapping().status).toBe('Confirmed');
      expect(savedMapping().program_id).toBe(program.id);
      expect(savedMapping().project_id).toBe(project.id);
    });

    it.each([
      ['proposed', 'proposed'],
      ['other text', 'under review'],
      ['no status field', undefined],
    ])(
      'stores Pending when the registry mapping status is %s',
      async (_label, status) => {
        await runSync([sourceMapping({ status })]);

        expect(mappingRepository.save).toHaveBeenCalledTimes(1);
        expect(savedMapping().status).toBe('Pending');
      },
    );

    it("promotes an existing Pending mapping to Confirmed when it now arrives 'agreed'", async () => {
      const existing = Object.assign(new ProjectMapping(), {
        id: 99,
        project_id: project.id,
        program_id: program.id,
        status: 'Pending',
        auditableFields: new AuditableEntity(),
      });

      await runSync([sourceMapping({ status: 'agreed' })], [existing]);

      // The ingest re-uses the existing row by program_id instead of creating a new one.
      expect(mappingRepository.create).not.toHaveBeenCalled();
      expect(mappingRepository.save).toHaveBeenCalledTimes(1);
      expect(savedMapping()).toBe(existing);
      expect(existing.status).toBe('Confirmed');
      expect(existing.auditableFields.is_active).toBe(true);
    });

    it('does not resurrect Confirmed for a program the registry no longer sends', async () => {
      const stale = Object.assign(new ProjectMapping(), {
        id: 100,
        project_id: project.id,
        program_id: 1234,
        status: 'Confirmed',
        auditableFields: Object.assign(new AuditableEntity(), {
          is_active: true,
        }),
      });

      await runSync([sourceMapping({ status: 'agreed' })], [stale]);

      // One save for the incoming mapping, one to deactivate the stale row.
      expect(mappingRepository.save).toHaveBeenCalledTimes(2);
      expect(stale.auditableFields.is_active).toBe(false);
      expect(stale.status).toBe('Confirmed');
    });
  });
});
