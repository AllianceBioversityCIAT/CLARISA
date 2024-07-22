import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateOutcomeIndicatorDto } from './dto/update-outcome-indicator.dto';
import { OutcomeIndicatorRepository } from './repositories/outcome-indicator.repository';
import { OutcomeIndicatorDto } from './dto/outcome-indicator.dto';

@Injectable()
export class OutcomeIndicatorService {
  constructor(
    private outcomeIndicatorsRepository: OutcomeIndicatorRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<OutcomeIndicatorDto[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.outcomeIndicatorsRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.outcomeIndicatorsRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<OutcomeIndicatorDto> {
    return await this.outcomeIndicatorsRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(updateOutcomeIndicatorDto: UpdateOutcomeIndicatorDto[]) {
    return await this.outcomeIndicatorsRepository.save(
      updateOutcomeIndicatorDto,
    );
  }
}
