import { Injectable } from '@nestjs/common';
import { FindAllOptions } from 'src/shared/entities/enums/find-all-options';
import { UpdateEnvironmentalBenefitDto } from './dto/update-environmental-benefit.dto';
import { EnvironmentalBenefit } from './entities/environmental-benefit.entity';
import { EnvironmentalBenefitRepository } from './repositories/environmental-benefit.repository';
import { FindOptionsSelect } from 'typeorm';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class EnvironmentalBenefitService {
  constructor(
    private _environmentalBenefitsRepository: EnvironmentalBenefitRepository,
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
        return await this._environmentalBenefitsRepository.find({
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._environmentalBenefitsRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          select: this._select,
        });
      default:
        throw new BadParamsError(
          this._environmentalBenefitsRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<BasicDtoV1> {
    return await this._environmentalBenefitsRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._environmentalBenefitsRepository.target.toString(),
          id,
        );
      });
  }

  async update(updateEnvironmentalBenefitDto: UpdateEnvironmentalBenefitDto[]) {
    return await this._environmentalBenefitsRepository.save(
      updateEnvironmentalBenefitDto,
    );
  }
}
