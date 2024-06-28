import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ApiTOC } from './api.toc';
import { PhaseRepository } from '../../../api/phase/repositories/phase.repository';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { PhaseStatus } from '../../entities/enums/phase-status';
import { PRMSApplication } from '../../entities/enums/prms-applications';
import { PhaseTocDto } from './dto/phases.toc.dto';
import { PhaseToc } from '../../../api/phase/entities/phase-toc.entity';
import { AuditableEntity } from '../../entities/extends/auditable-entity.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CronTOC {
  private readonly logger: Logger = new Logger(CronTOC.name);

  constructor(
    private readonly api: ApiTOC,
    private readonly phaseRepository: PhaseRepository,
  ) {}

  // every saturday at 10 pm
  @Cron('0 0 22 * * 6')
  public async cronTocPhasesData(): Promise<void> {
    const phasesRequest = await firstValueFrom(this.api.getPhases());

    if (phasesRequest && phasesRequest.status === HttpStatus.OK) {
      this.logger.debug('Started ToC phases synchronization');
      const tocPhasesRepository = this.phaseRepository.phaseRepositories.get(
        PRMSApplication.TOC.tableName,
      ) as Repository<PhaseToc>;

      const oldPhasesDb = await tocPhasesRepository.find();
      let updatedPhaseDb: PhaseToc[] = [];
      let newPhasesDb: PhaseToc[] = [];

      const phasesToc: PhaseTocDto[] =
        (phasesRequest.data?.data as PhaseTocDto[]) ?? [];
      const newPhasesToc = CronTOC.getNewPhases(oldPhasesDb, phasesToc);

      oldPhasesDb.forEach((op) => {
        CronTOC.updatePhase(op, phasesToc);
        updatedPhaseDb.push(op);
      });

      newPhasesToc.forEach((np) => {
        const newPhase = CronTOC.createNewPhase(np);
        newPhasesDb.push(newPhase);
      });

      updatedPhaseDb = await tocPhasesRepository.save(updatedPhaseDb);
      newPhasesDb = await tocPhasesRepository.save(newPhasesDb);
    }

    this.logger.debug('Finished ToC phases synchronization');
  }

  private static getNewPhases(
    phasesDb: PhaseToc[],
    phasesTOC: PhaseTocDto[],
  ): PhaseTocDto[] {
    return phasesTOC.filter((toc) => !phasesDb.find((db) => db.id === toc.id));
  }

  private static updatePhase(
    phase: PhaseToc,
    tocPhases: PhaseTocDto[],
  ): PhaseTocDto {
    const tocPhase: PhaseTocDto = tocPhases.find((oi) => oi.id === phase.id);

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

  private static createNewPhase(tocPhase: PhaseTocDto): PhaseToc {
    const newPhase: PhaseToc = new PhaseToc();

    newPhase.auditableFields = new AuditableEntity();
    newPhase.auditableFields.created_at = new Date();
    newPhase.auditableFields.created_by = 3043; //clarisadmin
    newPhase.auditableFields.is_active = tocPhase.active;
    newPhase.id = tocPhase.id;
    newPhase.is_open = tocPhase.status === PhaseStatus.SHOW_ONLY_OPEN.name;
    newPhase.name = tocPhase.name;
    newPhase.year = tocPhase.reporting_year;
    newPhase.auditableFields.updated_at = new Date();

    return newPhase;
  }
}
