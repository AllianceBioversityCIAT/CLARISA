import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SdgIndicator } from './entities/sdg-indicator.entity';
import { SdgIndicatorRepository } from './repositories/sdg-indicator.repository';
import { FindManyOptions } from 'typeorm';
import { SdgIndicatorMapper } from './mappers/sdg-indicator.mapper';
import { SdgIndicatorV1Dto } from './dto/sdg-indicator.v1.dto';
import { SdgIndicatorV2Dto } from './dto/sdg-indicator.v2.dto';

@Injectable()
export class SdgIndicatorService {
  private readonly _findClause: FindManyOptions<SdgIndicator> = {
    relations: { sdg_target_object: { sdg_object: true } },
  };

  constructor(
    private readonly _sdgIndicatorRepository: SdgIndicatorRepository,
    private readonly _sdgIndicatorMapper: SdgIndicatorMapper,
  ) {}

  private async _findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<SdgIndicator[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this._sdgIndicatorRepository.find(this._findClause);
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this._sdgIndicatorRepository.find({
          ...this._findClause,
          ...{
            where: {
              auditableFields: {
                is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
              },
            },
          },
        });
      default:
        throw Error('?!');
    }
  }

  private async _findOne(id: number): Promise<SdgIndicator> {
    return await this._sdgIndicatorRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async findAllV1(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<SdgIndicatorV1Dto[]> {
    const result: SdgIndicator[] = await this._findAll(option);

    return this._sdgIndicatorMapper.classListToDtoV1List(result);
  }

  async findAllV2(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<SdgIndicatorV2Dto[]> {
    const result: SdgIndicator[] = await this._findAll(option);

    return this._sdgIndicatorMapper.classListToDtoV2List(result);
  }

  async findOneV1(id: number): Promise<SdgIndicatorV1Dto> {
    const result: SdgIndicator = await this._findOne(id);
    return result ? this._sdgIndicatorMapper.classToDtoV1(result) : null;
  }

  async findOneV2(id: number): Promise<SdgIndicatorV2Dto> {
    const result: SdgIndicator = await this._findOne(id);
    return result ? this._sdgIndicatorMapper.classToDtoV2(result) : null;
  }
}
