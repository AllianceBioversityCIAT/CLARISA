import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Sdg } from './entities/sdg.entity';
import { SdgRepository } from './repositories/sdg.repository';
import { SdgMapper } from './mappers/sdg.mapper';
import { SdgV1Dto } from './dto/sdg.v1.dto';
import { SdgV2Dto } from './dto/sdg.v2.dto';

@Injectable()
export class SdgService {
  constructor(
    private readonly _sdgsRepository: SdgRepository,
    private readonly _sdgMapper: SdgMapper,
  ) {}

  private async _findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ) {
    let response: Sdg[];
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        response = await this._sdgsRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        response = await this._sdgsRepository.find({
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

    return response;
  }

  private async _findOne(id: number) {
    return await this._sdgsRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async findAllV1(option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE) {
    const sdgs = await this._findAll(option);
    return this._sdgMapper.classListToDtoV1List(sdgs);
  }

  async findAllV2(option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE) {
    const sdgs = await this._findAll(option);
    return this._sdgMapper.classListToDtoV2List(sdgs);
  }

  async findOneV1(id: number): Promise<SdgV1Dto> {
    const sdg = await this._findOne(id);
    return sdg ? this._sdgMapper.classToDtoV1(sdg) : null;
  }

  async findOneV2(id: number): Promise<SdgV2Dto> {
    const sdg = await this._findOne(id);
    return sdg ? this._sdgMapper.classToDtoV2(sdg) : null;
  }
}
