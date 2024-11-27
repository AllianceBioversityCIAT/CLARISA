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
    if (scienceGroup.parent_id) {
      scienceGroupDto.parent = this.classToDto(scienceGroup.parent);
    }

    return scienceGroupDto;
  }

  public classListToDtoList(scienceGroups: ScienceGroup[]): ScienceGroupDto[] {
    return scienceGroups.map((scienceGroup) => this.classToDto(scienceGroup));
  }
}
