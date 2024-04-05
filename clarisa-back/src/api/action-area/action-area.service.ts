import { Injectable } from '@nestjs/common';
import { ActionAreaRepository } from './repositories/action-area.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ActionAreaDto } from './dto/action-area.dto';
import { ActionAreaMapper } from './mappers/action-area.mapper';
import { ActionArea } from './entities/action-area.entity';

@Injectable()
export class ActionAreaService {
  constructor(
    private actionAreasRepository: ActionAreaRepository,
    private actionAreaMapper: ActionAreaMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ActionAreaDto[]> {
    let actionAreas: ActionArea[] = [];
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        actionAreas = await this.actionAreasRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        actionAreas = await this.actionAreasRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw Error('?!');
    }

    return this.actionAreaMapper.classListToDtoList(actionAreas);
  }

  async findOne(id: number): Promise<ActionAreaDto> {
    const actionArea = await this.actionAreasRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });

    return this.actionAreaMapper.classToDto(actionArea);
  }
}
