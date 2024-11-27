import { Injectable } from '@nestjs/common';
import { GeneralAcronymDto } from '../dto/general-acronym.dto';
import { GeneralAcronym } from '../entities/general-acronym.entity';

@Injectable()
export class GeneralAcronymMapper {
  public classToDto(generalAcronym: GeneralAcronym): GeneralAcronymDto {
    const generalAcronymDto: GeneralAcronymDto = new GeneralAcronymDto();

    generalAcronymDto.code = generalAcronym.id;
    generalAcronymDto.acronym = generalAcronym.acronym;
    generalAcronymDto.description = generalAcronym.description;

    return generalAcronymDto;
  }

  public classListToDtoList(
    generalAcronyms: GeneralAcronym[],
  ): GeneralAcronymDto[] {
    return generalAcronyms.map((generalAcronym) =>
      this.classToDto(generalAcronym),
    );
  }
}
