import { Injectable } from '@nestjs/common';
import { GlobalTarget } from '../entities/global-target.entity';
import { GlobalTargetDto } from '../dto/global-target.dto';

@Injectable()
export class GlobalTargetMapper {
  public classToDto(globalTarget: GlobalTarget): GlobalTargetDto {
    const globalTargetDto: GlobalTargetDto = new GlobalTargetDto();

    globalTargetDto.targetId = globalTarget.id;
    globalTargetDto.smo_code = globalTarget.smo_code;
    globalTargetDto.target = globalTarget.global_target;

    if (globalTarget.impact_area_object) {
      globalTargetDto.impactAreaId = globalTarget.impact_area_object.id;
      globalTargetDto.impactAreaName = globalTarget.impact_area_object.name;
    }

    return globalTargetDto;
  }

  public classListToDtoList(globalTargets: GlobalTarget[]): GlobalTargetDto[] {
    return globalTargets.map((globalTarget) => this.classToDto(globalTarget));
  }
}
