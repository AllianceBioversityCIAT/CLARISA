import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateActionAreaDto } from './dto/update-action-area.dto';
import { ActionArea } from './entities/action-area.entity';
import { ActionAreaRepository } from './repositories/action-area.repository';
import { ActionAreaDto } from './dto/action-area.dto';

@Injectable()
export class ActionAreaService {
  constructor(private actionAreasRepository: ActionAreaRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ActionAreaDto[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this.actionAreasRepository.find() as Promise<ActionAreaDto[]>;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this.actionAreasRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        }) as Promise<ActionAreaDto[]>;
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<ActionAreaDto> {
    return this.actionAreasRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    }) as Promise<ActionAreaDto>;
  }

  async update(
    updateUserDtoList: UpdateActionAreaDto[],
  ): Promise<ActionArea[]> {
    return await this.actionAreasRepository.save(updateUserDtoList);
  }
}
