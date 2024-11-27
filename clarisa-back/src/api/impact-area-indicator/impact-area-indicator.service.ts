import { Injectable } from '@nestjs/common';
import { UpdateImpactAreaIndicatorDto } from './dto/update-impact-area-indicator.dto';
import { ImpactAreaIndicatorDto } from './dto/impact-area-indicator.dto';
import { ImpactAreaIndicatorRepository } from './repositories/impact-area-indicator.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class ImpactAreaIndicatorService {
  constructor(
    private _impactAreaIndicatorRepository: ImpactAreaIndicatorRepository,
  ) {}

  findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ImpactAreaIndicatorDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._impactAreaIndicatorRepository.target.toString(),
        'option',
        option,
      );
    }

    return this._impactAreaIndicatorRepository.findAllImpactAreaIndicators(
      option,
    );
  }

  findOne(id: number): Promise<ImpactAreaIndicatorDto> {
    return this._impactAreaIndicatorRepository
      .findOneImpactAreaById(id)
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._impactAreaIndicatorRepository.target.toString(),
          id,
        );
      });
  }

  async update(updateImpactaAreaIndicator: UpdateImpactAreaIndicatorDto[]) {
    return await this._impactAreaIndicatorRepository.save(
      updateImpactaAreaIndicator,
    );
  }
}
