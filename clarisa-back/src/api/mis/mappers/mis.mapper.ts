import { Injectable } from '@nestjs/common';
import { Mis } from '../entities/mis.entity';
import { SimpleMisDto } from '../dto/simple-mis.dto';
import { BasicDtoMapper } from '../../../shared/mappers/basic-dto.mapper';

@Injectable()
export class MisMapper {
  constructor(private readonly _basicMDtoMapper: BasicDtoMapper<Mis>) {}

  public classToSimpleDto(mis: Mis): SimpleMisDto {
    const simpleMisDto: SimpleMisDto = new SimpleMisDto();

    Object.assign(simpleMisDto, this._basicMDtoMapper.classToDto(mis, false));

    simpleMisDto.acronym = mis.acronym;

    if (mis.environment_object) {
      simpleMisDto.environment = mis.environment_object.acronym;
    }

    return simpleMisDto;
  }

  public classListToSimpleDtoList(miss: Mis[]): SimpleMisDto[] {
    return miss.map((mis) => this.classToSimpleDto(mis));
  }
}
