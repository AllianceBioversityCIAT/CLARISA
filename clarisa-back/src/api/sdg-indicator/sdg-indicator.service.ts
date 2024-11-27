import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SdgIndicator } from './entities/sdg-indicator.entity';
import { SdgIndicatorRepository } from './repositories/sdg-indicator.repository';
import { FindManyOptions } from 'typeorm';
import { SdgIndicatorMapper } from './mappers/sdg-indicator.mapper';
import { SdgIndicatorV1Dto } from './dto/sdg-indicator.v1.dto';
import { SdgIndicatorV2Dto } from './dto/sdg-indicator.v2.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class SdgIndicatorService {
  private readonly _findClause: FindManyOptions<SdgIndicator> = {
    relations: { sdg_target_object: { sdg_object: true } },
  };

  constructor(
    private readonly _sdgIndicatorRepository: SdgIndicatorRepository,
    private readonly _sdgIndicatorMapper: SdgIndicatorMapper,
  ) {}

  private async _findAll<Dto>(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    mapper: (sdgs: SdgIndicator[]) => Dto[],
  ) {
    let sdgIndicators: SdgIndicator[] = [];
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        sdgIndicators = await this._sdgIndicatorRepository.find(
          this._findClause,
        );
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        sdgIndicators = await this._sdgIndicatorRepository.find({
          ...this._findClause,
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw new BadParamsError(
          this._sdgIndicatorRepository.target.toString(),
          'option',
          option,
        );
    }

    return mapper(sdgIndicators);
  }

  private async _findOne<Dto>(id: number, mapper: (sdgs: SdgIndicator) => Dto) {
    return this._sdgIndicatorRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._sdgIndicatorRepository.target.toString(),
          id,
        );
      })
      .then((sdg) => mapper(sdg));
  }

  async findAllV1(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<SdgIndicatorV1Dto[]> {
    return this._findAll(option, this._sdgIndicatorMapper.classListToDtoV1List);
  }

  async findAllV2(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<SdgIndicatorV2Dto[]> {
    return this._findAll(option, this._sdgIndicatorMapper.classListToDtoV2List);
  }

  async findOneV1(id: number): Promise<SdgIndicatorV1Dto> {
    return this._findOne(id, this._sdgIndicatorMapper.classToDtoV1);
  }

  async findOneV2(id: number): Promise<SdgIndicatorV2Dto> {
    return this._findOne(id, this._sdgIndicatorMapper.classToDtoV2);
  }
}
