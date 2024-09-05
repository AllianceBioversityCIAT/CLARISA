import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SdgTarget } from './entities/sdg-target.entity';
import { SdgTargetRepository } from './repositories/sdg-target.repository';
import { SdgTargetMapper } from './mappers/sdg-target.mapper';
import { SdgTargetV1Dto } from './dto/sdg-target.v1.dto';
import { SdgTargetV2Dto } from './dto/sdg-target.v2.dto';

@Injectable()
export class SdgTargetService {
  constructor(
    private readonly _sdgTargetsRepository: SdgTargetRepository,
    private readonly _sdgTargetMapper: SdgTargetMapper,
  ) {}

  private async _findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<SdgTarget[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this._sdgTargetsRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this._sdgTargetsRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw Error('?!');
    }
  }

  async findAllV1(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<SdgTargetV1Dto[]> {
    const result: SdgTarget[] = await this._findAll(option);

    return this._sdgTargetMapper.classListToDtoV1List(result);
  }

  async findAllV2(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<SdgTargetV2Dto[]> {
    const result: SdgTarget[] = await this._findAll(option);

    return this._sdgTargetMapper.classListToDtoV2List(result);
  }

  async findOne(id: number): Promise<SdgTarget> {
    return await this._sdgTargetsRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async findAllIpsr(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<SdgTarget[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._sdgTargetsRepository
          .query(`select sdgt.id, sdgt.sdg_target_code as sdgTargetCode, sdgt.sdg_target as sdgTarget, sdg.id as usndCode
                                                         from sustainable_development_goal_targets sdgt 
                                                        join sustainable_development_goals sdg on sdg.id = sdgt.sdg_id`);
      case FindAllOptions.SHOW_ONLY_ACTIVE:
        return await this._sdgTargetsRepository
          .query(`select sdgt.id, sdgt.sdg_target_code as sdgTargetCode, sdgt.sdg_target as sdgTarget, sdg.id as usndCode
                                                         from sustainable_development_goal_targets sdgt 
                                                        join sustainable_development_goals sdg on sdg.id = sdgt.sdg_id 
                                                        where sdgt.is_active = 1`);
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._sdgTargetsRepository
          .query(`select sdgt.id, sdgt.sdg_target_code as sdgTargetCode, sdgt.sdg_target as sdgTarget, sdg.id as usndCode
        from sustainable_development_goal_targets sdgt 
       join sustainable_development_goals sdg on sdg.id = sdgt.sdg_id 
       where sdgt.is_active = 0`);
      default:
        throw Error('?!');
    }
  }
}
