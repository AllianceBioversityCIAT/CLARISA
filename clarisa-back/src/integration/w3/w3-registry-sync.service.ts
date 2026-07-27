import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { W3RegistryApi } from './w3-registry.api';
import {
  W3RegistryMappingDto,
  W3RegistryProjectDto,
} from './dto/w3-registry-project.dto';
import { Project } from '../../api/project/entity/project.entity';
import { ProjectCountry } from '../../api/project/entity/project-country.entity';
import { ProjectMapping } from '../../api/project/entity/project-mapping.entity';
import { W3RegistrySync } from '../../api/project/entity/w3-registry-sync.entity';
import { W3RegistryProjectSnapshot } from '../../api/project/entity/w3-registry-project-snapshot.entity';
import { AuditableEntity } from '../../shared/entities/extends/auditable-entity.entity';
import { Country } from '../../api/country/entities/country.entity';
import { Institution } from '../../api/institution/entities/institution.entity';
import { CgiarEntity } from '../../api/cgiar-entity/entities/cgiar-entity.entity';

const W3_SOURCE = 'W3_REGISTRY';
const W3_PHASE = 2026;
const SYSTEM_USER_ID = 3043;
const PAGE_LIMIT = 100;

interface ProcessResult {
  created: boolean;
  warnings: string[];
}

@Injectable()
export class W3RegistrySyncService {
  private readonly logger = new Logger(W3RegistrySyncService.name);

  constructor(
    private readonly api: W3RegistryApi,
    private readonly dataSource: DataSource,
  ) {}

  async syncProjects(): Promise<W3RegistrySync> {
    const syncRepository = this.dataSource.getRepository(W3RegistrySync);
    const sync = await syncRepository.save(
      syncRepository.create({
        status: 'RUNNING',
        started_at: new Date(),
        processed_count: 0,
        created_count: 0,
        updated_count: 0,
        warning_count: 0,
      }),
    );

    try {
      let page = 1;
      let total = Number.POSITIVE_INFINITY;
      let sourceSnapshotId: number;

      while ((page - 1) * PAGE_LIMIT < total) {
        const response = await firstValueFrom(
          this.api.getPublishedProjects(page, PAGE_LIMIT),
        );

        if (!response || response.status !== HttpStatus.OK) {
          throw new Error(`W3 Registry returned HTTP ${response?.status}`);
        }

        const pageData = response.data;
        if (
          !pageData ||
          !Array.isArray(pageData.data) ||
          !Number.isFinite(pageData.total) ||
          pageData.page !== page ||
          pageData.limit !== PAGE_LIMIT
        ) {
          throw new Error('Invalid W3 Registry pagination response');
        }

        total = pageData.total;
        sync.expected_count = total;
        sourceSnapshotId ??= pageData.data[0]?.snapshotId;

        for (const project of pageData.data) {
          const result = await this.processProject(sync.id, project);
          sync.processed_count += 1;
          sync.warning_count += result.warnings.length;
          if (result.created) sync.created_count += 1;
          else sync.updated_count += 1;
          await syncRepository.save(sync);
        }

        page += 1;
      }

      sync.source_snapshot_id = sourceSnapshotId;
      sync.status = 'COMPLETED';
      sync.finished_at = new Date();
      return syncRepository.save(sync);
    } catch (error) {
      sync.status = 'FAILED';
      sync.finished_at = new Date();
      sync.error_message =
        error instanceof Error ? error.message : String(error);
      await syncRepository.save(sync);
      this.logger.error(sync.error_message);
      throw error;
    }
  }

  private async processProject(
    syncId: number,
    sourceProject: W3RegistryProjectDto,
  ): Promise<ProcessResult> {
    return this.dataSource.transaction(async (manager) => {
      const snapshotRepository = manager.getRepository(
        W3RegistryProjectSnapshot,
      );
      const warnings: string[] = [];
      const snapshot = await snapshotRepository.save(
        snapshotRepository.create({
          sync_id: syncId,
          external_project_id: String(sourceProject.sourceProjectId),
          source_record_id: sourceProject.id,
          external_code: sourceProject.code,
          source_snapshot_id: sourceProject.snapshotId,
          phase: W3_PHASE,
          payload: sourceProject as unknown as Record<string, unknown>,
          processing_status: 'RECEIVED',
          ingested_at: new Date(),
        }),
      );

      const projectRepository = manager.getRepository(Project);
      let project = await projectRepository.findOne({
        where: {
          external_source: W3_SOURCE,
          external_project_id: String(sourceProject.sourceProjectId),
        },
      });
      const created = !project;
      project ??= projectRepository.create();

      const center = await this.findInstitution(
        manager,
        sourceProject.centerAcronym,
        sourceProject.centerName,
      );
      const funder = await this.findInstitution(
        manager,
        undefined,
        sourceProject.funder,
      );
      if (
        !center &&
        (sourceProject.centerAcronym || sourceProject.centerName)
      ) {
        warnings.push(
          `Institution not resolved for ${sourceProject.centerAcronym ?? sourceProject.centerName}`,
        );
      }
      if (!funder && sourceProject.funder) {
        warnings.push(`Funder not resolved: ${sourceProject.funder}`);
      }

      project.short_name = sourceProject.code;
      project.full_name = sourceProject.name;
      project.description = this.normalizeDescription(
        sourceProject.description,
      );
      project.start_date = sourceProject.startDate;
      project.end_date = sourceProject.endDate;
      project.total_budget = sourceProject.totalBudget ?? '0.00';
      project.source_of_funding = sourceProject.fundingSource;
      project.phase = W3_PHASE;
      project.external_source = W3_SOURCE;
      project.external_project_id = String(sourceProject.sourceProjectId);
      project.external_record_id = sourceProject.id;
      project.external_code = sourceProject.code;
      project.source_status = sourceProject.status;
      project.source_snapshot_id = sourceProject.snapshotId;
      project.source_created_at = new Date(sourceProject.createdAt);
      project.source_updated_at = new Date(sourceProject.updatedAt);
      project.last_synced_at = new Date();
      project.source_center_name = sourceProject.centerName;
      project.source_center_acronym = sourceProject.centerAcronym;
      project.source_funder = sourceProject.funder;
      project.organization_code = center?.id;
      project.funder_code = funder?.id;
      project.auditableFields ??= new AuditableEntity();
      project.auditableFields.is_active = sourceProject.status === 'active';
      project.auditableFields.created_by ??= SYSTEM_USER_ID;
      project.auditableFields.updated_by = SYSTEM_USER_ID;
      project.auditableFields.updated_at = new Date();
      if (created) project.auditableFields.created_at = new Date();

      project = await projectRepository.save(project);
      await this.syncCountries(
        manager,
        project,
        sourceProject.countries ?? [],
        warnings,
      );
      await this.syncMappings(
        manager,
        project,
        sourceProject.mappings ?? [],
        warnings,
      );

      snapshot.project_id = project.id;
      snapshot.processing_status = warnings.length
        ? 'PROCESSED_WITH_WARNINGS'
        : 'PROCESSED';
      snapshot.warnings = warnings;
      await snapshotRepository.save(snapshot);
      return { created, warnings };
    });
  }

  private async syncCountries(
    manager: EntityManager,
    project: Project,
    sourceCountries: W3RegistryProjectDto['countries'],
    warnings: string[],
  ): Promise<void> {
    const repository = manager.getRepository(ProjectCountry);
    const existing = await repository.find({
      where: { project_id: project.id },
    });
    const receivedCodes = new Set<number>();

    for (const sourceCountry of sourceCountries) {
      const country = await manager.getRepository(Country).findOne({
        where: { iso_alpha_2: sourceCountry.isoAlpha2 },
      });
      if (!country) {
        warnings.push(`Country not resolved: ${sourceCountry.isoAlpha2}`);
        continue;
      }

      receivedCodes.add(country.iso_numeric);
      let projectCountry = existing.find(
        (item) => item.country_code === country.iso_numeric,
      );
      projectCountry ??= repository.create({
        project_id: project.id,
        country_code: country.iso_numeric,
      });
      projectCountry.allocation_percentage = String(
        sourceCountry.allocationPercentage,
      );
      projectCountry.auditableFields ??= new AuditableEntity();
      projectCountry.auditableFields.is_active = true;
      projectCountry.auditableFields.created_by ??= SYSTEM_USER_ID;
      projectCountry.auditableFields.updated_by = SYSTEM_USER_ID;
      await repository.save(projectCountry);
    }

    for (const projectCountry of existing) {
      if (!receivedCodes.has(projectCountry.country_code)) {
        projectCountry.auditableFields.is_active = false;
        projectCountry.auditableFields.updated_by = SYSTEM_USER_ID;
        await repository.save(projectCountry);
      }
    }
  }

  private async syncMappings(
    manager: EntityManager,
    project: Project,
    sourceMappings: W3RegistryMappingDto[],
    warnings: string[],
  ): Promise<void> {
    const repository = manager.getRepository(ProjectMapping);
    const existing = await repository.find({
      where: { project_id: project.id },
    });
    const receivedPrograms = new Set<number>();

    for (const sourceMapping of sourceMappings) {
      const program = await manager.getRepository(CgiarEntity).findOne({
        where: { smo_code: sourceMapping.programCode },
      });
      if (!program) {
        warnings.push(`Program not resolved: ${sourceMapping.programCode}`);
        continue;
      }

      receivedPrograms.add(program.id);
      let mapping = existing.find((item) => item.program_id === program.id);
      mapping ??= repository.create({
        project_id: project.id,
        program_id: program.id,
      });
      mapping.allocation = sourceMapping.allocationPercentage;
      mapping.complementarity = sourceMapping.complementarityRating;
      mapping.efficiencies = sourceMapping.efficiencyRating;
      mapping.source_program_code = sourceMapping.programCode;
      mapping.source_program_name = sourceMapping.programName;
      mapping.status = 'Pending';
      mapping.auditableFields ??= new AuditableEntity();
      mapping.auditableFields.is_active = true;
      mapping.auditableFields.created_by ??= SYSTEM_USER_ID;
      mapping.auditableFields.updated_by = SYSTEM_USER_ID;
      await repository.save(mapping);
    }

    for (const mapping of existing) {
      if (!receivedPrograms.has(mapping.program_id)) {
        mapping.auditableFields.is_active = false;
        mapping.auditableFields.updated_by = SYSTEM_USER_ID;
        await repository.save(mapping);
      }
    }
  }

  private async findInstitution(
    manager: EntityManager,
    acronym?: string,
    name?: string,
  ): Promise<Institution | null> {
    const repository = manager.getRepository(Institution);
    if (acronym) {
      const byAcronym = await repository.findOne({ where: { acronym } });
      if (byAcronym) return byAcronym;
    }
    if (name) return repository.findOne({ where: { name } });
    return null;
  }

  private normalizeDescription(description: string | null): string | null {
    return description === '/' ? null : description;
  }
}
