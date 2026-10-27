import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { of } from 'rxjs';
import { W3RegistryApi } from './w3-registry.api';
import {
  W3RegistrySyncService,
  isRecognizedMappingStatus,
  toMappingStatus,
} from './w3-registry-sync.service';
import { W3RegistryMappingDto } from './dto/w3-registry-project.dto';
import { Project } from '../../api/project/entity/project.entity';
import { ProjectMapping } from '../../api/project/entity/project-mapping.entity';
import { CgiarEntity } from '../../api/cgiar-entity/entities/cgiar-entity.entity';
import { AuditableEntity } from '../../shared/entities/extends/auditable-entity.entity';
import { W3RegistrySync } from '../../api/project/entity/w3-registry-sync.entity';

describe('W3RegistrySyncService', () => {
  describe('toMappingStatus', () => {
    it("maps 'agreed' to Confirmed, trimming and ignoring case", () => {
      expect(toMappingStatus('agreed')).toBe('Confirmed');
      expect(toMappingStatus(' Agreed ')).toBe('Confirmed');
      expect(toMappingStatus('AGREED')).toBe('Confirmed');
    });

    it("maps 'admin_decision' to Confirmed, trimming and ignoring case", () => {
      expect(toMappingStatus('admin_decision')).toBe('Confirmed');
      expect(toMappingStatus('Admin_Decision')).toBe('Confirmed');
      expect(toMappingStatus(' admin_decision ')).toBe('Confirmed');
    });

    it('keeps anything else as Pending', () => {
      expect(toMappingStatus('proposed')).toBe('Pending');
      expect(toMappingStatus('foo')).toBe('Pending');
      expect(toMappingStatus('rejected')).toBe('Pending');
      expect(toMappingStatus('some other text')).toBe('Pending');
      expect(toMappingStatus('')).toBe('Pending');
      expect(toMappingStatus(undefined)).toBe('Pending');
      expect(toMappingStatus(null)).toBe('Pending');
    });
  });

  describe('isRecognizedMappingStatus', () => {
    it('recognizes only the approved statuses, trimming and ignoring case', () => {
      expect(isRecognizedMappingStatus('agreed')).toBe(true);
      expect(isRecognizedMappingStatus(' AGREED ')).toBe(true);
      expect(isRecognizedMappingStatus('admin_decision')).toBe(true);
      expect(isRecognizedMappingStatus(' Admin_Decision ')).toBe(true);
      expect(isRecognizedMappingStatus('proposed')).toBe(false);
      expect(isRecognizedMappingStatus('foo')).toBe(false);
      expect(isRecognizedMappingStatus('')).toBe(false);
      expect(isRecognizedMappingStatus(undefined)).toBe(false);
      expect(isRecognizedMappingStatus(null)).toBe(false);
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

    it("promotes an existing Pending mapping to Confirmed without warning when it now arrives 'admin_decision'", async () => {
      const existing = Object.assign(new ProjectMapping(), {
        id: 101,
        project_id: project.id,
        program_id: program.id,
        status: 'Pending',
        auditableFields: new AuditableEntity(),
      });

      const warnings = await runSync(
        [sourceMapping({ status: 'admin_decision' })],
        [existing],
      );

      expect(existing.status).toBe('Confirmed');
      expect(warnings).toEqual([]);
    });

    it("creates a new 'admin_decision' mapping as Confirmed without warning", async () => {
      const warnings = await runSync([
        sourceMapping({ status: 'admin_decision' }),
      ]);

      expect(mappingRepository.create).toHaveBeenCalledTimes(1);
      expect(savedMapping().status).toBe('Confirmed');
      expect(warnings).toEqual([]);
    });

    it('stores Pending and warns, without throwing, for an unknown status', async () => {
      const existing = Object.assign(new ProjectMapping(), {
        id: 102,
        project_id: project.id,
        program_id: program.id,
        status: 'Confirmed',
        auditableFields: new AuditableEntity(),
      });

      const warnings = await runSync(
        [sourceMapping({ status: 'foo' })],
        [existing],
      );

      expect(existing.status).toBe('Pending');
      expect(warnings).toEqual(["Unknown mapping status 'foo' for SP01"]);
    });

    it('stores Pending and warns with (empty) when the status is missing', async () => {
      const warnings = await runSync([sourceMapping({ status: undefined })]);

      expect(savedMapping().status).toBe('Pending');
      expect(warnings).toEqual(["Unknown mapping status '(empty)' for SP01"]);
    });

    it("does not warn for an 'agreed' mapping", async () => {
      const warnings = await runSync([sourceMapping({ status: 'agreed' })]);

      expect(warnings).toEqual([]);
    });
  });

  describe('syncProjects concurrency guard', () => {
    let service: W3RegistrySyncService;
    const now = new Date('2026-11-01T03:00:00.000Z');
    const minutesAgo = (minutes: number) =>
      new Date(now.getTime() - minutes * 60 * 1000);

    const syncRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const api = { getPublishedProjects: jest.fn() };
    const dataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === W3RegistrySync) return syncRepository;
        throw new Error(`Unexpected repository ${entity?.name}`);
      }),
    };

    const runningSync = (id: number, startedMinutesAgo: number) =>
      Object.assign(new W3RegistrySync(), {
        id,
        status: 'RUNNING',
        started_at: minutesAgo(startedMinutesAgo),
      });

    // Records created by syncProjects, as opposed to updates of existing rows.
    const createdRecords = () =>
      syncRepository.create.mock.results.map((result) => result.value);

    beforeEach(async () => {
      jest.clearAllMocks();
      jest.useFakeTimers().setSystemTime(now);

      syncRepository.create.mockImplementation(
        (partial: Partial<W3RegistrySync>) =>
          Object.assign(new W3RegistrySync(), partial),
      );
      syncRepository.save.mockImplementation(async (row) => {
        if (!Array.isArray(row) && row.id === undefined) row.id = 500;
        return row;
      });
      api.getPublishedProjects.mockReturnValue(
        of({ status: 200, data: { data: [], total: 0, page: 1, limit: 100 } }),
      );

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          W3RegistrySyncService,
          { provide: W3RegistryApi, useValue: api },
          { provide: DataSource, useValue: dataSource },
        ],
      }).compile();

      service = module.get<W3RegistrySyncService>(W3RegistrySyncService);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('runs the sync when no other sync is running', async () => {
      syncRepository.find.mockResolvedValue([]);

      const result = await service.syncProjects();

      expect(createdRecords()).toHaveLength(1);
      expect(api.getPublishedProjects).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('COMPLETED');
    });

    it('rejects with ConflictException and touches nothing while a recent sync is running', async () => {
      const running = runningSync(77, 5);
      syncRepository.find.mockResolvedValue([running]);

      await expect(service.syncProjects()).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(syncRepository.create).not.toHaveBeenCalled();
      expect(syncRepository.save).not.toHaveBeenCalled();
      expect(api.getPublishedProjects).not.toHaveBeenCalled();
      expect(running.status).toBe('RUNNING');
      expect(running.finished_at).toBeUndefined();
    });

    it('names the running sync in the conflict message', async () => {
      syncRepository.find.mockResolvedValue([runningSync(77, 5)]);

      await expect(service.syncProjects()).rejects.toThrow(
        /sync 77 is already running since 2026-11-01T02:55:00.000Z/,
      );
    });

    it.each([
      ['31 minutes', 31],
      ['exactly 30 minutes', 30],
    ])(
      'closes a sync running for %s as FAILED and starts a new one',
      async (_label, startedMinutesAgo) => {
        const stale = runningSync(66, startedMinutesAgo);
        const older = runningSync(65, 120);
        syncRepository.find.mockResolvedValue([stale, older]);

        const result = await service.syncProjects();

        for (const row of [stale, older]) {
          expect(row.status).toBe('FAILED');
          expect(row.finished_at).toEqual(now);
          expect(row.error_message).toContain('Abandoned');
        }
        expect(syncRepository.save).toHaveBeenCalledWith([stale, older]);
        expect(createdRecords()).toHaveLength(1);
        expect(result.status).toBe('COMPLETED');
      },
    );
  });
});
