import { Injectable } from '@nestjs/common';
import { IndicatorDto } from '../dto/indicator.dto';
import { Indicator } from '../entities/indicator.entity';

@Injectable()
export class IndicatorMapper {
  classToDto(indicator: Indicator): IndicatorDto {
    const indicatorDto: IndicatorDto = new IndicatorDto();

    indicatorDto.id = indicator.id;
    indicatorDto.smoCode = indicator.smo_code;
    indicatorDto.outcomeIndicatorStatement =
      indicator.outcome_indicator_statement;

    return indicatorDto;
  }

  classListToDtoList(indicators: Indicator[]): IndicatorDto[] {
    return indicators.map((indicator) => this.classToDto(indicator));
  }
}
