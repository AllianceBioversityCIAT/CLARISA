import { Injectable } from '@nestjs/common';
import { FindOptionsOrder, Like } from 'typeorm';
import { Center } from './entities/center.entity';
import { CenterRepository } from './repositories/center.repository';
import { CgiarEntityTypeRepository } from '../cgiar-entity-type/repositories/cgiar-entity-type.repository';
import { CenterMapper } from './mappers/center.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { CenterDtoV1 } from './dto/center.v1.dto';

@Injectable()
export class CenterService {
  private readonly orderClause: FindOptionsOrder<Center> = {
    smo_code: {
      direction: 'ASC',
    },
  };

  constructor(
    private _centerRepository: CenterRepository,
    private _cgiarEntityTypeRepository: CgiarEntityTypeRepository,
    private _centerMapper: CenterMapper,
  ) {}

  async findAllV1(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<CenterDtoV1[]> {
    let result: Center[] = [];

    const type = await this._cgiarEntityTypeRepository.findOneBy({
      name: Like('%center%'),
    });

    if (!type) {
      throw Error('Center type not found?!');
    }

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        result = await this._centerRepository.find({
          order: this.orderClause,
        });
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        result = await this._centerRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          order: this.orderClause,
        });
        break;
      default:
        throw Error('?!');
    }

    result.forEach((center) => {
      center.cgiar_entity_type_object = type;
    });

    return this._centerMapper.classListToDtoV1List(result);
  }

  async findOneV1(id: number): Promise<CenterDtoV1> {
    const type = await this._cgiarEntityTypeRepository.findOneBy({
      name: Like('%center%'),
    });

    if (!type) {
      throw Error('Center type not found?!');
    }

    const result = await this._centerRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });

    if (result) {
      result.cgiar_entity_type_object = type;
      return this._centerMapper.classToDtoV1(result);
    }

    return null;
  }
}
