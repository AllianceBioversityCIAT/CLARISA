import { Injectable } from '@nestjs/common';
import { ScienceGroup } from '../entities/science-group.entity';
import { ScienceGroupDto } from '../dto/science-group.dto';

@Injectable()
export class ScienceGroupMapper {
  public classToDto(scienceGroup: ScienceGroup): ScienceGroupDto {
    const scienceGroupDto: ScienceGroupDto = new ScienceGroupDto();

    scienceGroupDto.code = scienceGroup.id;
    scienceGroupDto.description = scienceGroup.description;
    scienceGroupDto.financialCode = scienceGroup.financial_code;
    scienceGroupDto.parent = scienceGroup.parent_id
      ? this.classToDto(scienceGroup.parent)
      : null;

    return scienceGroupDto;
  }

  public classListToDtoList(scienceGroups: ScienceGroup[]): ScienceGroupDto[] {
    return scienceGroups.map((scienceGroup) => this.classToDto(scienceGroup));
  }
}
