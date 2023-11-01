import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { PRMSApplication } from '../../entities/enums/prms-applications';
import { ApiReporting } from './api.reporting';
import { PhaseRepository } from '../../../api/phase/repositories/phase.repository';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import {
  Phase,
  PhaseConstructor,
} from '../../../api/phase/entities/phase.entity';
import { PhaseReportingDto } from './dto/phases.reporting.dto';
import { AuditableEntity } from '../../entities/extends/auditable-entity.entity';

@Injectable()
export class CronReporting {
  private readonly logger: Logger = new Logger(CronReporting.name);

  constructor(
    private readonly api: ApiReporting,
    private readonly phaseRepository: PhaseRepository,
  ) {}

  // every saturday at 9 pm
  @Cron('* * 21 * * 6')
  public async cronReportingPhasesData(): Promise<void> {
    const apps = PRMSApplication.getAllPhaseTables();
    for (const app of apps) {
      await this.syncPhasesDataFromApplication(app);
    }
  }

  public async syncPhasesDataFromApplication<T extends Phase>(
    app: PRMSApplication,
  ): Promise<void> {
    const phasesRequest = await firstValueFrom(this.api.getPhases(app));

    if (phasesRequest && phasesRequest.status === HttpStatus.OK) {
      this.logger.debug(`Started ${app.prettyName} phases synchronization`);
      const appPhasesRepository = this.phaseRepository.phaseRepositories.get(
        app.tableName,
      );
      const repoTargetClazz = appPhasesRepository.metadata
        .target as unknown as T;

      const oldPhasesDb = (await appPhasesRepository.find()) as T[];
      let updatedPhaseDb: T[] = [];
      let newPhasesDb: T[] = [];

      const phasesReporting: PhaseReportingDto[] =
        (phasesRequest.data?.response as PhaseReportingDto[]) ?? [];
      const newPhasesReporting = CronReporting.getNewPhases(
        oldPhasesDb,
        phasesReporting,
      );

      oldPhasesDb.forEach((op) => {
        CronReporting.updatePhase(op, phasesReporting);
        updatedPhaseDb.push(op);
      });

      newPhasesReporting.forEach((np) => {
        const newInstance = CronReporting.createNewPhaseObject(
          repoTargetClazz.constructor(),
        );
        const newPhase = CronReporting.createNewPhase(np, newInstance);
        newPhasesDb.push(newPhase as T);
      });

      updatedPhaseDb = await appPhasesRepository.save(updatedPhaseDb);
      newPhasesDb = await appPhasesRepository.save(newPhasesDb);
    }

    this.logger.debug(`Finished ${app.prettyName} phases synchronization`);
  }

  private static getNewPhases<T extends Phase>(
    phasesDb: T[],
    phasesReporting: PhaseReportingDto[],
  ): PhaseReportingDto[] {
    return phasesReporting.filter(
      (toc) => !phasesDb.find((db) => db.id === toc.id),
    );
  }

  private static updatePhase<T extends Phase>(
    phase: T,
    tocPhases: PhaseReportingDto[],
  ): PhaseReportingDto {
    const tocPhase: PhaseReportingDto = tocPhases.find(
      (oi) => oi.id === phase.id,
    );

    if (tocPhase) {
      phase.auditableFields.is_active = tocPhase.is_active;
      phase.is_open = tocPhase.status;
      phase.name = tocPhase.phase_name;
      phase.year = tocPhase.phase_year;
    } else {
      phase.auditableFields.is_active = false;
    }

    phase.auditableFields.updated_at = new Date();
    phase.auditableFields.updated_by = 3043; //clarisadmin

    return tocPhase;
  }

  private static createNewPhaseObject<T extends Phase>(
    clazz: PhaseConstructor<T>,
  ): T {
    return new clazz();
  }

  private static createNewPhase<T extends Phase>(
    appPhase: PhaseReportingDto,
    newPhase: T,
  ): T {
    /*
      we should not be able to do this, but reflection and generics
      allows us doing it. marking the function generic and extending
      the Phase class, it allows us to pass a constructor of any subclasses 
      of Phase and return a new instance of that specific class.
    */
    newPhase.auditableFields = new AuditableEntity();
    newPhase.auditableFields.created_at = new Date();
    newPhase.auditableFields.created_by = 3043; //clarisadmin
    newPhase.auditableFields.is_active = appPhase.is_active;
    newPhase.id = appPhase.id;
    newPhase.is_open = appPhase.status;
    newPhase.name = appPhase.phase_name;
    newPhase.year = appPhase.phase_year;
    newPhase.auditableFields.updated_at = new Date();

    return newPhase;
  }
}
