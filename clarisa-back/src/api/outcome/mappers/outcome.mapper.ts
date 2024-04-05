import { OutcomeDto } from '../dto/outcome.dto';
import { Outcome } from '../entities/outcome.entity';

export class OutcomeMapper {
  classToDto(outcome: Outcome): OutcomeDto {
    const outcomeDto: OutcomeDto = new OutcomeDto();

    outcomeDto.id = outcome.id;
    outcomeDto.outcomeStatement = outcome.outcome_statement;

    return outcomeDto;
  }

  classListToDtoList(outcomes: Outcome[]): OutcomeDto[] {
    return outcomes.map((outcome) => this.classToDto(outcome));
  }
}
