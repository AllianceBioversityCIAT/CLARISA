import { Injectable } from '@nestjs/common';
import { InstitutionType } from '../entities/institution-type.entity';
import { SimpleInstitutionTypeDto } from '../dto/simple-institution-type.dto';

@Injectable()
export class InstitutionTypeMapper {
  classToSimpleDto(institutionType: InstitutionType): SimpleInstitutionTypeDto {
    const institutionTypeDto: SimpleInstitutionTypeDto =
      new SimpleInstitutionTypeDto();

    institutionTypeDto.code = institutionType.id;
    institutionTypeDto.name = institutionType.name;
    institutionTypeDto.description = institutionType.description;
    institutionTypeDto.id_parent = institutionType.parent_id;

    return institutionTypeDto;
  }

  classListToSimpleDtoList(
    institutionTypes: InstitutionType[],
  ): SimpleInstitutionTypeDto[] {
    return institutionTypes.map((institutionType) =>
      this.classToSimpleDto(institutionType),
    );
  }
}
