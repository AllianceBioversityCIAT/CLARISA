import { Injectable } from '@nestjs/common';
import { IndicatorRepository } from './repositories/indicator.repository';
import { IndicatorMapper } from './mappers/indicator.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { IndicatorDto } from './dto/indicator.dto';
import { Indicator } from './entities/indicator.entity';

@Injectable()
export class IndicatorService {
  constructor(
    private indicatorsRepository: IndicatorRepository,
    private indicatorMapper: IndicatorMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<IndicatorDto[]> {
    let indicators: Indicator[] = [];
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        indicators = await this.indicatorsRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        indicators = await this.indicatorsRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw Error('?!');
    }

    return this.indicatorMapper.classListToDtoList(indicators);
  }

  async findOne(id: number): Promise<IndicatorDto> {
    const indicator = await this.indicatorsRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });

    return this.indicatorMapper.classToDto(indicator);
  }
}
