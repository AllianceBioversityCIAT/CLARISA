import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SdgTarget } from './entities/sdg-target.entity';
import { SdgTargetRepository } from './repositories/sdg-target.repository';
import { SdgTargetMapper } from './mappers/sdg-target.mapper';
import { SdgTargetV1Dto } from './dto/sdg-target.v1.dto';
import { SdgTargetV2Dto } from './dto/sdg-target.v2.dto';
import { SdgTargetIpsrDto } from './dto/sdg-target-ipsr.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class SdgTargetService {
  constructor(
    private readonly _sdgTargetsRepository: SdgTargetRepository,
    private readonly _sdgTargetMapper: SdgTargetMapper,
  ) {}

  private async _findAll<Dto>(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    mapper: (sdgs: SdgTarget[]) => Dto[],
  ) {
    let sdgTargets: SdgTarget[] = [];
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        sdgTargets = await this._sdgTargetsRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        sdgTargets = await this._sdgTargetsRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw new BadParamsError(
          this._sdgTargetsRepository.target.toString(),
          'option',
          option,
        );
    }

    return mapper(sdgTargets);
  }

  private async _findOne<Dto>(id: number, mapper: (sdgs: SdgTarget) => Dto) {
    return this._sdgTargetsRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._sdgTargetsRepository.target.toString(),
          id,
        );
      })
      .then((sdgTarget) => mapper(sdgTarget));
  }

  async findAllV1(option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE) {
    return this._findAll(option, this._sdgTargetMapper.classListToDtoV1List);
  }

  async findAllV2(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<SdgTargetV2Dto[]> {
    return this._findAll(option, this._sdgTargetMapper.classListToDtoV2List);
  }

  async findOneV1(id: number): Promise<SdgTargetV1Dto> {
    return this._findOne(id, this._sdgTargetMapper.classToDtoV1);
  }

  async findOneV2(id: number): Promise<SdgTargetV2Dto> {
    return this._findOne(id, this._sdgTargetMapper.classToDtoV2);
  }

  findAllForIpsr(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<SdgTargetIpsrDto[]> {
    return this._sdgTargetsRepository.findAllForIpsr(option);
  }
}
