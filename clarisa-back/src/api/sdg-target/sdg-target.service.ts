import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SdgTarget } from './entities/sdg-target.entity';
import { SdgTargetRepository } from './repositories/sdg-target.repository';
import { SdgTargetMapper } from './mappers/sdg-target.mapper';
import { SdgTargetV1Dto } from './dto/sdg-target.v1.dto';
import { SdgTargetV2Dto } from './dto/sdg-target.v2.dto';
import { SdgTargetIpsrDto } from './dto/sdg-target-ipsr.dto';

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

  private async _findOne(id: number): Promise<SdgTarget> {
    return await this._sdgTargetsRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
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

  async findOneV1(id: number): Promise<SdgTargetV1Dto> {
    const sdgTarget = await this._findOne(id);

    return sdgTarget ? this._sdgTargetMapper.classToDtoV1(sdgTarget) : null;
  }

  async findOneV2(id: number): Promise<SdgTargetV2Dto> {
    const sdgTarget = await this._findOne(id);

    return sdgTarget ? this._sdgTargetMapper.classToDtoV2(sdgTarget) : null;
  }

  findAllForIpsr(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<SdgTargetIpsrDto[]> {
    return this._sdgTargetsRepository.findAllForIpsr(option);
  }
}
