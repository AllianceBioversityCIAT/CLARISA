import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateActionAreaDto } from './dto/update-action-area.dto';
import { ActionArea } from './entities/action-area.entity';
import { ActionAreaRepository } from './repositories/action-area.repository';
import { ActionAreaDto } from './dto/action-area.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class ActionAreaService {
  constructor(private _actionAreaRepository: ActionAreaRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ActionAreaDto[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this._actionAreaRepository.find() as Promise<ActionAreaDto[]>;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this._actionAreaRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        }) as Promise<ActionAreaDto[]>;
      default:
        throw new BadParamsError(
          this._actionAreaRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<ActionAreaDto> {
    return this._actionAreaRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._actionAreaRepository.target.toString(),
          id,
        );
      }) as Promise<ActionAreaDto>;
  }

  async update(
    updateUserDtoList: UpdateActionAreaDto[],
  ): Promise<ActionArea[]> {
    return await this._actionAreaRepository.save(updateUserDtoList);
  }
}
