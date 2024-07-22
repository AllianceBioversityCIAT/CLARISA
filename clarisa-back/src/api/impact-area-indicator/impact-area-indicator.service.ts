import { Injectable } from '@nestjs/common';
import { UpdateImpactAreaIndicatorDto } from './dto/update-impact-area-indicator.dto';
import { ImpactAreaIndicatorDto } from './dto/impact-area-indicator.dto';
import { ImpactAreaIndicatorRepository } from './repositories/impact-area-indicator.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Injectable()
export class ImpactAreaIndicatorService {
  constructor(
    private impactAreaIndicatorRepository: ImpactAreaIndicatorRepository,
  ) {}

  findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ImpactAreaIndicatorDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    return this.impactAreaIndicatorRepository.findAllImpactAreaIndicators(
      option,
    );
  }

  findOne(id: number): Promise<ImpactAreaIndicatorDto> {
    return this.impactAreaIndicatorRepository.findOneImpactAreaById(id);
  }

  async update(updateImpactaAreaIndicator: UpdateImpactAreaIndicatorDto[]) {
    return await this.impactAreaIndicatorRepository.save(
      updateImpactaAreaIndicator,
    );
  }
}
