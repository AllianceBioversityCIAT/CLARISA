import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateHomepageClarisaEndpointDto } from './dto/update-homepage-clarisa-endpoint.dto';
import { HomepageClarisaEndpoint } from './entities/homepage-clarisa-endpoint.entity';
import { HomepageClarisaEndpointRepository } from './repositories/homepage-clarisa-endpoint.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class HomepageClarisaEndpointService {
  constructor(
    private _homepageClarisaEndpointRepository: HomepageClarisaEndpointRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<HomepageClarisaEndpoint[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this._homepageClarisaEndpointRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this._homepageClarisaEndpointRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._homepageClarisaEndpointRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<HomepageClarisaEndpoint> {
    return this._homepageClarisaEndpointRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._homepageClarisaEndpointRepository.target.toString(),
          id,
        );
      });
  }

  async update(
    updateGeneralDtoList: UpdateHomepageClarisaEndpointDto[],
  ): Promise<HomepageClarisaEndpoint[]> {
    return await this._homepageClarisaEndpointRepository.save(
      updateGeneralDtoList,
    );
  }
}
