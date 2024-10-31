import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ActionAreaOutcomeIndicatorRepository } from '../action-area-outcome-indicator/repositories/action-area-outcome-indicator-repository';
import { ActionAreaOutcomeDto } from './dto/action-area-outcome.dto';
import { UpdateActionAreaOutcomeDto } from './dto/update-action-area-outcome.dto';
import { ActionAreaOutcomeRepository } from './repositories/action-area-outcome.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
import { OneActionAreaOutcomeDto } from './dto/one-action-area-outcome.dto';

@Injectable()
export class ActionAreaOutcomeService {
  constructor(
    private _actionAreaOutcomeRepository: ActionAreaOutcomeRepository,
    private _actionAreaOutcomeIndicatorRepository: ActionAreaOutcomeIndicatorRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ActionAreaOutcomeDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._actionAreaOutcomeRepository.target.toString(),
        'option',
        option,
      );
    }

    return this._actionAreaOutcomeIndicatorRepository.findActionAreaOutcomeIndicators(
      option,
    ) as Promise<ActionAreaOutcomeDto[]>;
  }

  async findOne(id: number): Promise<OneActionAreaOutcomeDto> {
    return this._actionAreaOutcomeRepository
      .findActionAreaOutcomeById(id)
      .then((actionAreaOutcome) => {
        if (!actionAreaOutcome) {
          throw ClarisaEntityNotFoundError.forId(
            this._actionAreaOutcomeIndicatorRepository.target.toString(),
            id,
          );
        }

        return actionAreaOutcome;
      });
  }

  async update(updateActionAreaOutcomeDto: UpdateActionAreaOutcomeDto[]) {
    return await this._actionAreaOutcomeRepository.save(
      updateActionAreaOutcomeDto,
    );
  }
}
