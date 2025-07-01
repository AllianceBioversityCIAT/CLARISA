import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateInnovationUseLevelDto } from './dto/update-innovation-use-level.dto';
import { InnovationUseLevel } from './entities/innovation-use-level.entity';
import { InnovationUseLevelRepository } from './repositories/innovation-use-level.repository';
import { FindOptionsSelect } from 'typeorm';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class InnovationUseLevelService {
  constructor(
    private _innovationUseLevelRepository: InnovationUseLevelRepository,
  ) {}
  private readonly _select: FindOptionsSelect<InnovationUseLevel> = {
    id: true,
    name: true,
    level: true,
    definition: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BasicDtoV1[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._innovationUseLevelRepository.find({
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._innovationUseLevelRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          select: this._select,
        });
      default:
        throw new BadParamsError(
          this._innovationUseLevelRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<BasicDtoV1> {
    return await this._innovationUseLevelRepository
      .findOneOrFail({
        where: { id, auditableFields: { is_active: true } },
        select: this._select,
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._innovationUseLevelRepository.target.toString(),
          id,
        );
      });
  }

  async update(
    updateInnovationUseLevelDtoList: UpdateInnovationUseLevelDto[],
  ): Promise<InnovationUseLevel[]> {
    return await this._innovationUseLevelRepository.save(
      updateInnovationUseLevelDtoList,
    );
  }
}
