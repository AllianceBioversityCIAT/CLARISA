import { Injectable } from '@nestjs/common';
import { UpdateImpactAreaIndicatorDto } from './dto/update-impact-area-indicator.dto';
import { ImpactAreaIndicator } from './entities/impact-area-indicator.entity';
import { ImpactAreaIndicatorDto } from './dto/impact-area-indicator.dto';
import { ImpactAreaIndicatorRepository } from './repositories/impact-area-indicator.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Injectable()
export class ImpactAreaIndicatorService {
  constructor(
    private impactAreaIndicatorRepository: ImpactAreaIndicatorRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    version?: number,
  ): Promise<ImpactAreaIndicatorDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    return this.impactAreaIndicatorRepository.findAllImpactAreaIndicators(
      option,
      version,
    );
  }

  async findOne(id: number): Promise<ImpactAreaIndicator> {
    return await this.impactAreaIndicatorRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(updateImpactaAreaIndicator: UpdateImpactAreaIndicatorDto[]) {
    return await this.impactAreaIndicatorRepository.save(
      updateImpactaAreaIndicator,
    );
  }
}
