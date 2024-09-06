import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { RiskApi } from './risk.api';
import { PhaseRiskDto } from './dto/phases.risk.dto';
import { PhaseRepository } from '../../api/phase/repositories/phase.repository';
import { PRMSApplication } from '../../shared/entities/enums/prms-applications';
import { PhaseRisk } from '../../api/phase/entities/phase-risk.entity';
import { PhaseStatus } from '../../shared/entities/enums/phase-status';
import { AuditableEntity } from '../../shared/entities/extends/auditable-entity.entity';
import { Immutable } from '../../shared/utils/deep-immutable';
import { ResponseRiskDto } from './dto/response.risk.dto';
import { AxiosResponse } from 'axios';

@Injectable()
export class RiskCron {
  private readonly logger: Logger = new Logger(RiskCron.name);

  constructor(
    private readonly api: Immutable<RiskApi>,
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    private readonly phaseRepository: Immutable<PhaseRepository>,
  ) {}

  // every saturday at 11 pm
  @Cron('0 0 23 * * 6')
  public async cronRiskPhasesData(): Promise<void> {
    const phasesRequest = (await firstValueFrom(
      this.api.getPhases(),
    )) as Partial<AxiosResponse<ResponseRiskDto>> | null;

    if (phasesRequest && phasesRequest.status === HttpStatus.OK) {
      this.logger.debug('Started Risk phases synchronization');
      const riskPhasesRepository = this.phaseRepository.phaseRepositories.get(
        PRMSApplication.RISK.tableName,
      ) as Repository<PhaseRisk>;

      const oldPhasesDb = await riskPhasesRepository.find();
      let updatedPhaseDb: PhaseRisk[] = [];
      let newPhasesDb: PhaseRisk[] = [];

      const phasesRisk: PhaseRiskDto[] = phasesRequest.data?.result ?? [];
      const newPhasesRisk = RiskCron.getNewPhases(oldPhasesDb, phasesRisk);

      oldPhasesDb.forEach((op) => {
        RiskCron.updatePhase(op, phasesRisk);
        updatedPhaseDb.push(op);
      });

      newPhasesRisk.forEach((np) => {
        const newPhase = RiskCron.createNewPhase(np);
        newPhasesDb.push(newPhase);
      });

      updatedPhaseDb = await riskPhasesRepository.save(updatedPhaseDb);
      newPhasesDb = await riskPhasesRepository.save(newPhasesDb);
    }

    this.logger.debug('Finished Risk phases synchronization');
  }

  private static getNewPhases(
    phasesDb: Immutable<PhaseRisk[]>,
    phasesRisk: Immutable<PhaseRiskDto[]>,
  ): PhaseRiskDto[] {
    return phasesRisk.filter(
      (risk) => !phasesDb.find((db) => db.id === String(risk.id)),
    );
  }

  private static updatePhase(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    phase: PhaseRisk,
    riskPhases: Immutable<PhaseRiskDto[]>,
  ): PhaseRiskDto | undefined {
    const riskPhase: PhaseRiskDto | undefined = riskPhases.find(
      (oi) => String(oi.id) === phase.id,
    ) as PhaseRiskDto | undefined;

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

  private static createNewPhase(riskPhase: Immutable<PhaseRiskDto>): PhaseRisk {
    const newPhase: PhaseRisk = new PhaseRisk();

    newPhase.id = String(riskPhase.id);
    newPhase.is_open = riskPhase.status === PhaseStatus.SHOW_ONLY_OPEN.name;
    newPhase.name = riskPhase.name;
    newPhase.year = riskPhase.reporting_year;

    newPhase.auditableFields = new AuditableEntity();
    newPhase.auditableFields.created_at = new Date();
    newPhase.auditableFields.created_by = 3043; //clarisadmin
    newPhase.auditableFields.is_active = riskPhase.active;
    newPhase.auditableFields.updated_at = new Date();

    return newPhase;
  }
}
