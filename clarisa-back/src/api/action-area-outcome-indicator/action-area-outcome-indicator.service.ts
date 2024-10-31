import { Injectable } from '@nestjs/common';
import { UpdateActionAreaOutcomeIndicatorDto } from './dto/update-action-area-outcome-indicator.dto';
import { ActionAreaOutcomeIndicatorDto } from './dto/action-area-outcome-indicator.dto';
import { ActionAreaOutcomeIndicatorRepository } from './repositories/action-area-outcome-indicator-repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class ActionAreaOutcomeIndicatorService {
  constructor(
    private _actionAreaOutcomeIndicatorRepository: ActionAreaOutcomeIndicatorRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ActionAreaOutcomeIndicatorDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._actionAreaOutcomeIndicatorRepository.target.toString(),
        'option',
        option,
      );
    }

    return this._actionAreaOutcomeIndicatorRepository.findActionAreaOutcomeIndicators(
      option,
      false,
    ) as Promise<ActionAreaOutcomeIndicatorDto[]>;
  }

  async findOne(id: number): Promise<ActionAreaOutcomeIndicatorDto> {
    return (
      this._actionAreaOutcomeIndicatorRepository.findActionAreaOutcomeIndicators(
        FindAllOptions.SHOW_ALL,
        false,
        id,
      ) as Promise<ActionAreaOutcomeIndicatorDto[]>
    ).then((actionAreaOutcomeIndicator) => {
      if (actionAreaOutcomeIndicator?.length === 0) {
        throw ClarisaEntityNotFoundError.forId(
          this._actionAreaOutcomeIndicatorRepository.target.toString(),
          id,
        );
      }

      return actionAreaOutcomeIndicator[0];
    });
  }

  async update(
    updateActionAreaOutcomeIndicatorDto: UpdateActionAreaOutcomeIndicatorDto[],
  ) {
    return await this._actionAreaOutcomeIndicatorRepository.save(
      updateActionAreaOutcomeIndicatorDto,
    );
  }
}
