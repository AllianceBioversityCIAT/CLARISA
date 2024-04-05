import { Injectable } from '@nestjs/common';
import { ActionArea } from '../entities/action-area.entity';
import { ActionAreaDto } from '../dto/action-area.dto';

@Injectable()
export class ActionAreaMapper {
  classToDto(actionArea: ActionArea): ActionAreaDto {
    const actionAreaDto: ActionAreaDto = new ActionAreaDto();

    actionAreaDto.id = actionArea.id;
    actionAreaDto.name = actionArea.name;
    actionAreaDto.description = actionArea.description;
    actionAreaDto.icon = actionArea.icon;
    actionAreaDto.color = actionArea.color;

    return actionAreaDto;
  }

  classListToDtoList(actionAreas: ActionArea[]): ActionAreaDto[] {
    return actionAreas.map((actionArea) => this.classToDto(actionArea));
  }
}
