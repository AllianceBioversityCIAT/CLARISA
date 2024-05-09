import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PhaseRepository } from '../../../api/phase/repositories/phase.repository';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { PhaseStatus } from '../../entities/enums/phase-status';
import { PRMSApplication } from '../../entities/enums/prms-applications';
import { PhaseRisk } from '../../../api/phase/entities/phase-risk.entity';
import { AuditableEntity } from '../../entities/extends/auditable-entity.entity';
import { Repository } from 'typeorm';
import { ApiRisk } from './api.risk';
import { PhaseRiskDto } from './dto/phases.risk.dto';

@Injectable()
export class CronRisk {
  private readonly logger: Logger = new Logger(CronRisk.name);

  constructor(
    private readonly api: ApiRisk,
    private readonly phaseRepository: PhaseRepository,
  ) {}

  // every saturday at 11 pm
  @Cron('* * 23 * * 6')
  public async cronRiskPhasesData(): Promise<void> {
    const phasesRequest = await firstValueFrom(this.api.getPhases());

    if (phasesRequest && phasesRequest.status === HttpStatus.OK) {
      this.logger.debug('Started Risk phases synchronization');
      const riskPhasesRepository = this.phaseRepository.phaseRepositories.get(
        PRMSApplication.RISK.tableName,
      ) as Repository<PhaseRisk>;

      const oldPhasesDb = await riskPhasesRepository.find();
      let updatedPhaseDb: PhaseRisk[] = [];
      let newPhasesDb: PhaseRisk[] = [];

      const phasesRisk: PhaseRiskDto[] =
        (phasesRequest?.data?.result as PhaseRiskDto[]) ?? [];
      const newPhasesRisk = CronRisk.getNewPhases(oldPhasesDb, phasesRisk);

      oldPhasesDb.forEach((op) => {
        CronRisk.updatePhase(op, phasesRisk);
        updatedPhaseDb.push(op);
      });

      newPhasesRisk.forEach((np) => {
        const newPhase = CronRisk.createNewPhase(np);
        newPhasesDb.push(newPhase);
      });

      updatedPhaseDb = await riskPhasesRepository.save(updatedPhaseDb);
      newPhasesDb = await riskPhasesRepository.save(newPhasesDb);
    }

    this.logger.debug('Finished Risk phases synchronization');
  }

  private static getNewPhases(
    phasesDb: PhaseRisk[],
    phasesRisk: PhaseRiskDto[],
  ): PhaseRiskDto[] {
    return phasesRisk.filter(
      (risk) => !phasesDb.find((db) => db.id == String(risk.id)),
    );
  }

  private static updatePhase(
    phase: PhaseRisk,
    riskPhases: PhaseRiskDto[],
  ): PhaseRiskDto {
    const riskPhase: PhaseRiskDto = riskPhases.find(
      (oi) => String(oi.id) == phase.id,
    );

    if (riskPhase) {
      phase.auditableFields.is_active = riskPhase.active;
      phase.is_open = riskPhase.status === PhaseStatus.SHOW_ONLY_OPEN.name;
      phase.name = riskPhase.name;
      phase.year = riskPhase.reporting_year;
    } else {
      phase.auditableFields.is_active = false;
    }

    phase.auditableFields.updated_at = new Date();
    phase.auditableFields.updated_by = 3043; //clarisadmin

    return riskPhase;
  }

  private static createNewPhase(riskPhase: PhaseRiskDto): PhaseRisk {
    const newPhase: PhaseRisk = new PhaseRisk();

    newPhase.auditableFields = new AuditableEntity();
    newPhase.auditableFields.created_at = new Date();
    newPhase.auditableFields.created_by = 3043; //clarisadmin
    newPhase.auditableFields.is_active = riskPhase.active;
    newPhase.id = String(riskPhase.id);
    newPhase.is_open = riskPhase.status === PhaseStatus.SHOW_ONLY_OPEN.name;
    newPhase.name = riskPhase.name;
    newPhase.year = riskPhase.reporting_year;
    newPhase.auditableFields.updated_at = new Date();

    return newPhase;
  }
}
