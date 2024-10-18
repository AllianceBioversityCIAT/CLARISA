import { Injectable } from '@nestjs/common';
import { PhaseRepository } from './repositories/phase.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Phase } from './entities/phase.entity';
import { PhaseStatus } from '../../shared/entities/enums/phase-status';
import { PhaseDto } from './dto/phase.dto';
import { PhaseMapper } from './mappers/phase.mapper';
import { PRMSApplication } from '../../shared/entities/enums/prms-applications';
import { BadParamsError } from '../../shared/errors/bad-params.error';

@Injectable()
export class PhaseService {
  constructor(
    private _phaseRepository: PhaseRepository,
    private _phaseMapper: PhaseMapper,
  ) {}

  async findAll(
    show: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    status: string = PhaseStatus.SHOW_ONLY_OPEN.path,
  ): Promise<PhaseDto[]> {
    if (!PhaseStatus.getfromPath(status)) {
      throw new BadParamsError('Phases', 'status', status);
    }

    const phases: Phase[] = await this._phaseRepository.findAllPhases(
      status,
      show,
      PRMSApplication.ALL.simpleName,
    );

    return this._phaseMapper.classListToDtoList(phases);
  }

  async findAllByApplication(
    application: string,
    show: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    status: string = PhaseStatus.SHOW_ONLY_OPEN.path,
  ): Promise<PhaseDto[]> {
    if (!PhaseStatus.getfromPath(status)) {
      throw new BadParamsError('Phases', 'status', status);
    }

    if (!PRMSApplication.getfromSimpleName(application)) {
      throw new BadParamsError('Phases', 'application', application);
    }

    const phases: Phase[] = await this._phaseRepository.findAllPhases(
      status,
      show,
      application,
    );

    return this._phaseMapper.classListToDtoList(phases);
  }
}
