import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Sdg } from './entities/sdg.entity';
import { SdgRepository } from './repositories/sdg.repository';
import { SdgMapper } from './mappers/sdg.mapper';

@Injectable()
export class SdgService {
  constructor(
    private readonly _sdgsRepository: SdgRepository,
    private readonly _sdgMapper: SdgMapper,
  ) {}

  private async findAll(
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

  async findAllV1(option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE) {
    const sdgs = await this.findAll(option);
    return this._sdgMapper.classListToDtoV1List(sdgs);
  }

  async findAllV2(option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE) {
    const sdgs = await this.findAll(option);
    return this._sdgMapper.classListToDtoV2List(sdgs);
  }

  async findOne(id: number): Promise<Sdg> {
    return await this._sdgsRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }
}
