import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { TOCApi } from './toc.api';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { PhaseTocDto } from './dto/phases.toc.dto';
import { Repository } from 'typeorm';
import { PhaseRepository } from '../../api/phase/repositories/phase.repository';
import { PRMSApplication } from '../../shared/entities/enums/prms-applications';
import { PhaseToc } from '../../api/phase/entities/phase-toc.entity';
import { PhaseStatus } from '../../shared/entities/enums/phase-status';
import { AuditableEntity } from '../../shared/entities/extends/auditable-entity.entity';
import { Immutable } from '../../shared/utils/deep-immutable';
import { AxiosResponse } from 'axios';
import { ResponseTocDto } from './dto/response.toc.dto';

@Injectable()
export class TOCCron {
  private readonly logger: Logger = new Logger(TOCCron.name);

  constructor(
    private api: Immutable<TOCApi>,
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    private phaseRepository: Immutable<PhaseRepository>,
  ) {}

  // every saturday at 10 pm
  @Cron('0 0 22 * * 6')
  public async cronTocPhasesData(): Promise<void> {
    const phasesRequest = (await firstValueFrom(
      this.api.getPhases(),
    )) as Partial<AxiosResponse<ResponseTocDto<PhaseTocDto>>> | null;

    if (
      phasesRequest &&
      (phasesRequest.status as HttpStatus) === HttpStatus.OK
    ) {
      this.logger.debug('Started ToC phases synchronization');
      const tocPhasesRepository = this.phaseRepository.phaseRepositories.get(
        PRMSApplication.TOC.tableName,
      ) as Repository<PhaseToc>;

      const oldPhasesDb = await tocPhasesRepository.find();
      let updatedPhaseDb: PhaseToc[] = [];
      let newPhasesDb: PhaseToc[] = [];

      const phasesToc: PhaseTocDto[] =
        (phasesRequest.data?.data as PhaseTocDto[] | undefined) ?? [];
      const newPhasesToc = TOCCron.getNewPhases(oldPhasesDb, phasesToc);

      oldPhasesDb.forEach((op) => {
        TOCCron.updatePhase(op, phasesToc);
        updatedPhaseDb.push(op);
      });

      newPhasesToc.forEach((np) => {
        const newPhase = TOCCron.createNewPhase(np);
        newPhasesDb.push(newPhase);
      });

      updatedPhaseDb = await tocPhasesRepository.save(updatedPhaseDb);
      newPhasesDb = await tocPhasesRepository.save(newPhasesDb);
    }

    this.logger.debug('Finished ToC phases synchronization');
  }

  private static getNewPhases(
    phasesDb: Immutable<PhaseToc[]>,
    phasesTOC: Immutable<PhaseTocDto[]>,
  ): PhaseTocDto[] {
    return phasesTOC.filter((toc) => !phasesDb.find((db) => db.id === toc.id));
  }

  private static updatePhase(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    phase: PhaseToc,
    tocPhases: Immutable<PhaseTocDto[]>,
  ): PhaseTocDto | undefined {
    const tocPhase: PhaseTocDto | undefined = tocPhases.find(
      (oi) => oi.id === phase.id,
    ) as PhaseTocDto | undefined;

    if (tocPhase) {
      phase.auditableFields.is_active = tocPhase.active;
      phase.is_open = tocPhase.status === PhaseStatus.SHOW_ONLY_OPEN.name;
      phase.name = tocPhase.name;
      phase.year = tocPhase.reporting_year;
    } else {
      phase.auditableFields.is_active = false;
    }

    phase.auditableFields.updated_at = new Date();
    phase.auditableFields.updated_by = 3043; //clarisadmin

    return tocPhase;
  }

  private static createNewPhase(tocPhase: Immutable<PhaseTocDto>): PhaseToc {
    const newPhase: PhaseToc = new PhaseToc();

    newPhase.id = tocPhase.id;
    newPhase.is_open = tocPhase.status === PhaseStatus.SHOW_ONLY_OPEN.name;
    newPhase.name = tocPhase.name;
    newPhase.year = tocPhase.reporting_year;

    newPhase.auditableFields = new AuditableEntity();
    newPhase.auditableFields.created_at = new Date();
    newPhase.auditableFields.created_by = 3043; //clarisadmin
    newPhase.auditableFields.is_active = tocPhase.active;
    newPhase.auditableFields.updated_at = new Date();

    return newPhase;
  }
}
