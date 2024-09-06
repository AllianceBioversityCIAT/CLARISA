import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ReportingApi } from './reporting.api';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { PhaseReportingDto } from './dto/phases.reporting.dto';
import { Phase, PhaseConstructor } from '../../api/phase/entities/phase.entity';
import { AuditableEntity } from '../../shared/entities/extends/auditable-entity.entity';
import { PhaseRepository } from '../../api/phase/repositories/phase.repository';
import { PRMSApplication } from '../../shared/entities/enums/prms-applications';
import { Immutable } from '../../shared/utils/deep-immutable';
import { AxiosResponse } from 'axios';
import { ResponseReportingDto } from './dto/response.reporting.dto';

@Injectable()
export class ReportingCron {
  private readonly logger: Logger = new Logger(ReportingCron.name);

  constructor(
    private readonly api: Immutable<ReportingApi>,
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    private readonly phaseRepository: Immutable<PhaseRepository>,
  ) {}

  // every saturday at 9 pm
  @Cron('0 0 21 * * 6')
  public async cronReportingPhasesData(): Promise<void> {
    const apps = PRMSApplication.getAllPhaseTables();
    for (const app of apps) {
      await this.syncPhasesDataFromApplication(app);
    }
  }

  public async syncPhasesDataFromApplication(
    app: PRMSApplication,
  ): Promise<void> {
    const phasesRequest = (await firstValueFrom(
      this.api.getPhases(app),
    )) as Partial<
      AxiosResponse<ResponseReportingDto<PhaseReportingDto>>
    > | null;

    if (phasesRequest && phasesRequest.status === HttpStatus.OK) {
      this.logger.debug(`Started ${app.prettyName} phases synchronization`);
      const appPhasesRepository = this.phaseRepository.phaseRepositories.get(
        app.tableName,
      );
      const repoTargetClazz = appPhasesRepository?.metadata
        .target as unknown as Phase;

      const oldPhasesDb = (await appPhasesRepository?.find()) as Phase[];
      let updatedPhaseDb: Phase[] | undefined = [];
      let newPhasesDb: Phase[] | undefined = [];

      const phasesReporting: PhaseReportingDto[] =
        (phasesRequest.data?.response as PhaseReportingDto[] | undefined) ?? [];
      const newPhasesReporting = ReportingCron.getNewPhases(
        oldPhasesDb,
        phasesReporting,
      );

      oldPhasesDb.forEach((op) => {
        ReportingCron.updatePhase(op, phasesReporting);
        updatedPhaseDb?.push(op);
      });

      newPhasesReporting.forEach((np) => {
        const newInstance = ReportingCron.createNewPhaseObject(
          repoTargetClazz.constructor() as PhaseConstructor<Phase>,
        );
        const newPhase = ReportingCron.createNewPhase(np, newInstance);
        newPhasesDb?.push(newPhase);
      });

      updatedPhaseDb = await appPhasesRepository?.save(updatedPhaseDb);
      newPhasesDb = await appPhasesRepository?.save(newPhasesDb);
    }

    this.logger.debug(`Finished ${app.prettyName} phases synchronization`);
  }

  private static getNewPhases<T extends Phase>(
    phasesDb: readonly T[],
    phasesReporting: Immutable<PhaseReportingDto[]>,
  ): PhaseReportingDto[] {
    return phasesReporting.filter(
      (toc) => !phasesDb.find((db) => db.id === toc.id),
    );
  }

  private static updatePhase(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    phase: Phase,
    tocPhases: Immutable<PhaseReportingDto[]>,
  ): PhaseReportingDto | undefined {
    const tocPhase: PhaseReportingDto | undefined = tocPhases.find(
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
    appPhase: Immutable<PhaseReportingDto>,
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
    newPhase.auditableFields.updated_at = new Date();

    newPhase.id = appPhase.id;
    newPhase.is_open = appPhase.status;
    newPhase.name = appPhase.phase_name;
    newPhase.year = appPhase.phase_year;

    return newPhase;
  }
}
