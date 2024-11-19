import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Sdg } from './entities/sdg.entity';
import { SdgRepository } from './repositories/sdg.repository';
import { SdgMapper } from './mappers/sdg.mapper';
import { SdgV1Dto } from './dto/sdg.v1.dto';
import { SdgV2Dto } from './dto/sdg.v2.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class SdgService {
  constructor(
    private readonly _sdgsRepository: SdgRepository,
    private readonly _sdgMapper: SdgMapper,
  ) {}

  private async _findAll<Dto>(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    mapper: (sdgs: Sdg[]) => Dto[],
  ) {
    let sdgs: Sdg[];

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        sdgs = await this._sdgsRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        sdgs = await this._sdgsRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw new BadParamsError(
          this._sdgsRepository.target.toString(),
          'option',
          option,
        );
    }

    return mapper(sdgs);
  }

  private async _findOne<Dto>(id: number, mapper: (sdgs: Sdg) => Dto) {
    return this._sdgsRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._sdgsRepository.target.toString(),
          id,
        );
      })
      .then((sdg) => mapper(sdg));
  }

  async findAllV1(option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE) {
    const boundMapper = this._sdgMapper.classListToDtoV1List.bind(
      this._sdgMapper,
    );
    return this._findAll(option, boundMapper);
  }

  async findAllV2(option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE) {
    const boundMapper = this._sdgMapper.classListToDtoV2List.bind(
      this._sdgMapper,
    );
    return this._findAll(option, boundMapper);
  }

  async findOneV1(id: number): Promise<SdgV1Dto> {
    return this._findOne(id, this._sdgMapper.classToDtoV1);
  }

  async findOneV2(id: number): Promise<SdgV2Dto> {
    return this._findOne(id, this._sdgMapper.classToDtoV2);
  }
}
