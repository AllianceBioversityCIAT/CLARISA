import { Injectable } from '@nestjs/common';
import { FindManyOptions, FindOptionsOrder } from 'typeorm';
import { CgiarEntityTypeOption } from '../../shared/entities/enums/cgiar-entity-types';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { CgiarEntity } from './entities/cgiar-entity.entity';
import { CgiarEntityRepository } from './repositories/cgiar-entity.repository';
import { CgiarEntityMapper } from './mappers/cgiar-entity.mapper';
import { CgiarEntityDtoV1 } from './dto/cgiar-entity.v1.dto';
import { CgiarEntityDtoV2 } from './dto/cgiar-entity.v2.dto';
import { CenterService } from '../center/center.service';
import { CenterDtoV1 } from '../center/dto/center.v1.dto';
import { Portfolio } from '../portfolio/entities/portfolio.entity';

@Injectable()
export class CgiarEntityService {
  private readonly orderClause: FindOptionsOrder<CgiarEntity> = {
    smo_code: {
      direction: 'ASC',
    },
  };

  private readonly _findOptionsV2: FindManyOptions<CgiarEntity> = {
    relations: {
      parent_object: true,
      cgiar_entity_type_object: true,
      portfolio_object: true,
    },
  };

  constructor(
    private _cgiarEntityRepository: CgiarEntityRepository,
    private _centerService: CenterService,
    private _cgiarEntityMapper: CgiarEntityMapper,
  ) {}

  async findAllV1(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type?: string,
  ): Promise<CgiarEntityDtoV1[]> {
    if (type && !CgiarEntityTypeOption.getfromPath(type)) {
      throw Error('?!');
    }

    const typeOption: CgiarEntityTypeOption =
      CgiarEntityTypeOption.getfromPath(type);
    let result: CgiarEntity[] = [];
    let centers: CenterDtoV1[] = [];

    if (!typeOption || CgiarEntityTypeOption.CENTER === typeOption) {
      centers = await this._centerService.findAllV1(option);
    }

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        result = await this._cgiarEntityRepository.find({
          where: typeOption
            ? { cgiar_entity_type_object: { id: typeOption.entity_type_id } }
            : undefined,
          order: this.orderClause,
          relations: { cgiar_entity_type_object: true },
        });
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        result = await this._cgiarEntityRepository.find({
          where: {
            ...(typeOption
              ? { cgiar_entity_type_object: { id: typeOption.entity_type_id } }
              : undefined),
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          order: this.orderClause,
          relations: { cgiar_entity_type_object: true },
        });
        break;
      default:
        throw Error('?!');
    }

    return this._cgiarEntityMapper.classListToDtoV1List(result).concat(centers);
  }

  async findOneV1(id: number): Promise<CgiarEntityDtoV1> {
    const maxId = <number | undefined>(
      (
        await this._cgiarEntityRepository.query(
          'select max(id) as max from global_units',
        )
      )?.[0].max
    );

    if (id > maxId) {
      return this._centerService.findOneV1(id - maxId);
    }

    const result = await this._cgiarEntityRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });

    return result ? this._cgiarEntityMapper.classToDtoV1(result) : null;
  }

  async findAllV2(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<CgiarEntityDtoV2[]> {
    let cgiarEntities: CgiarEntity[] = [];
    let showIsActive = true;
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        cgiarEntities = await this._cgiarEntityRepository.find(
          this._findOptionsV2,
        );
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        showIsActive = option !== FindAllOptions.SHOW_ONLY_ACTIVE;
        cgiarEntities = await this._cgiarEntityRepository.find({
          relations: this._findOptionsV2.relations,
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

    return this._cgiarEntityMapper.classListToDtoV2List(
      cgiarEntities,
      showIsActive,
    );
  }

  async findOneV2(id: number): Promise<CgiarEntityDtoV2> {
    const result = await this._cgiarEntityRepository.findOne({
      where: { id },
      relations: this._findOptionsV2.relations,
    });

    return this._cgiarEntityMapper.classToDtoV2(result, true);
  }

  async getGlobalUnitsHierarchy(): Promise<any[]> {
    const parents = await this._cgiarEntityRepository.find({
      where: { level: 1 },
      relations: [
        'portfolio_object',
        'cgiar_entity_type_object',
        'children',
        'children.portfolio_object',
        'children.cgiar_entity_type_object',
      ],
      order: {
        name: 'ASC',
        children: {
          name: 'ASC',
        },
      },
    });

    return parents.map((parent) => ({
      id: parent.id,
      name: parent.name,
      smo_code: parent.smo_code,
      level: parent.level,
      portfolio_id: parent.portfolio_id,
      portfolio: parent.portfolio_object?.name || null,
      cgiar_entity_type: parent.cgiar_entity_type_object
        ? {
            code: parent.cgiar_entity_type_object.id,
            name: parent.cgiar_entity_type_object.name,
          }
        : null,
      acronym: parent.acronym,
      children: parent.children.map((child) => ({
        id: child.id,
        code: child.smo_code,
        name: child.name,
        acronym: child.acronym,
        portfolio_id: child.portfolio_id,
        portfolio: child.portfolio_object?.name || null,
        cgiar_entity_type: child.cgiar_entity_type_object
          ? {
              code: child.cgiar_entity_type_object.id,
              name: child.cgiar_entity_type_object.name,
            }
          : null,
      })),
    }));
  }
}
