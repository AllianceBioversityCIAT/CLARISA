import { Injectable } from '@nestjs/common';
import { FindAllOptions } from 'src/shared/entities/enums/find-all-options';
import { UpdateEnvironmentalBenefitDto } from './dto/update-environmental-benefit.dto';
import { EnvironmentalBenefit } from './entities/environmental-benefit.entity';
import { EnvironmentalBenefitRepository } from './repositories/environmental-benefit.repository';
import { FindOptionsSelect } from 'typeorm';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';

@Injectable()
export class EnvironmentalBenefitService {
  constructor(
    private environmentalBenefitsRepository: EnvironmentalBenefitRepository,
  ) {}
  private readonly _select: FindOptionsSelect<EnvironmentalBenefit> = {
    id: true,
    name: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BasicDtoV1[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.environmentalBenefitsRepository.find({
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.environmentalBenefitsRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          select: this._select,
        });
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<BasicDtoV1> {
    return await this.environmentalBenefitsRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(updateEnvironmentalBenefitDto: UpdateEnvironmentalBenefitDto[]) {
    return await this.environmentalBenefitsRepository.save(
      updateEnvironmentalBenefitDto,
    );
  }
}
