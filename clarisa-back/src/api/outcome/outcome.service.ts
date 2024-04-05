import { Injectable } from '@nestjs/common';
import { OutcomeRepository } from './repositories/outcome.repository';
import { OutcomeMapper } from './mappers/outcome.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { OutcomeDto } from './dto/outcome.dto';
import { Outcome } from './entities/outcome.entity';

@Injectable()
export class OutcomeService {
  constructor(
    private outcomesRepository: OutcomeRepository,
    private outcomeMapper: OutcomeMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<OutcomeDto[]> {
    let outcomes: Outcome[] = [];
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        outcomes = await this.outcomesRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        outcomes = await this.outcomesRepository.find({
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

    return this.outcomeMapper.classListToDtoList(outcomes);
  }

  async findOne(id: number): Promise<OutcomeDto> {
    const outcome = await this.outcomesRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });

    return this.outcomeMapper.classToDto(outcome);
  }
}
