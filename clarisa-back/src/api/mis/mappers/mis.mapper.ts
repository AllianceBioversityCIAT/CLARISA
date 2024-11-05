import { Injectable } from '@nestjs/common';
import { Mis } from '../entities/mis.entity';
import { BasicDtoMapper } from '../../../shared/mappers/basic-dto.mapper';
import { MisDto } from '../dto/mis.dto';

@Injectable()
export class MisMapper {
  constructor(private readonly _basicMDtoMapper: BasicDtoMapper<Mis>) {}

  public classToDto(mis: Mis): MisDto {
    const simpleMisDto: MisDto = new MisDto();

    Object.assign(simpleMisDto, this._basicMDtoMapper.classToDtoV1(mis, false));

    simpleMisDto.acronym = mis.acronym;

    if (mis.environment_object) {
      simpleMisDto.environment = mis.environment_object.acronym;
    }

    return simpleMisDto;
  }

  public classListToDtoList(miss: Mis[]): MisDto[] {
    return miss.map((mis) => this.classToDto(mis));
  }
}
