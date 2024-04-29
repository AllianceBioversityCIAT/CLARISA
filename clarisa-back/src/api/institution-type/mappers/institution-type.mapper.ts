import { Injectable } from '@nestjs/common';
import { InstitutionTypeDto } from '../dto/institution-type.dto';
import { InstitutionType } from '../entities/institution-type.entity';

@Injectable()
export class InstitutionTypeMapper {
  classToSimpleDto(institutionType: InstitutionType): InstitutionTypeDto {
    const institutionTypeDto: InstitutionTypeDto = new InstitutionTypeDto();

    institutionTypeDto.code = institutionType.id;
    institutionTypeDto.name = institutionType.name;
    institutionTypeDto.description = institutionType.description;
    institutionTypeDto.id_parent = institutionType.parent_id;

    return institutionTypeDto;
  }
}
