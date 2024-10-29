import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateOutcomeIndicatorDto } from './dto/update-outcome-indicator.dto';
import { OutcomeIndicatorRepository } from './repositories/outcome-indicator.repository';
import { OutcomeIndicatorDto } from './dto/outcome-indicator.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class OutcomeIndicatorService {
  constructor(
    private _outcomeIndicatorsRepository: OutcomeIndicatorRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<OutcomeIndicatorDto[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._outcomeIndicatorsRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._outcomeIndicatorsRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._outcomeIndicatorsRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<OutcomeIndicatorDto> {
    return this._outcomeIndicatorsRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._outcomeIndicatorsRepository.target.toString(),
          id,
        );
      });
  }

  async update(updateOutcomeIndicatorDto: UpdateOutcomeIndicatorDto[]) {
    return await this._outcomeIndicatorsRepository.save(
      updateOutcomeIndicatorDto,
    );
  }
}
