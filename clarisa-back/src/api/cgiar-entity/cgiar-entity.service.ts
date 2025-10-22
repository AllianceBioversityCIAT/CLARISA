import { Injectable } from '@nestjs/common';
import { FindManyOptions, FindOptionsOrder, In } from 'typeorm';
import { CgiarEntityTypeOption } from '../../shared/entities/enums/cgiar-entity-types';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { CgiarEntity } from './entities/cgiar-entity.entity';
import { CgiarEntityRepository } from './repositories/cgiar-entity.repository';
import { CgiarEntityMapper } from './mappers/cgiar-entity.mapper';
import { CgiarEntityDtoV1 } from './dto/cgiar-entity.v1.dto';
import { CgiarEntityDtoV2 } from './dto/cgiar-entity.v2.dto';
import { CenterService } from '../center/center.service';
import { CenterDtoV1 } from '../center/dto/center.v1.dto';

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
      outgoing_lineages: {
        to_global_unit: {
          parent_object: true,
        },
      },
      incoming_lineages: {
        from_global_unit: {
          parent_object: true,
        },
      },
    },
  };

  constructor(
    private readonly _cgiarEntityRepository: CgiarEntityRepository,
    private readonly _centerService: CenterService,
    private readonly _cgiarEntityMapper: CgiarEntityMapper,
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
    filters?: { type?: string; portfolioId?: number; year?: number },
  ): Promise<CgiarEntityDtoV2[]> {
    const qb = this._cgiarEntityRepository
      .createQueryBuilder('gu')
      .leftJoinAndSelect('gu.parent_object', 'parent')
      .leftJoinAndSelect('gu.cgiar_entity_type_object', 'type')
      .leftJoinAndSelect('gu.portfolio_object', 'portfolio')
      .leftJoinAndSelect('gu.outgoing_lineages', 'outgoing_lineage')
      .leftJoinAndSelect(
        'outgoing_lineage.to_global_unit',
        'outgoing_lineage_to',
      )
      .leftJoinAndSelect(
        'outgoing_lineage_to.parent_object',
        'outgoing_lineage_to_parent',
      )
      .leftJoinAndSelect('gu.incoming_lineages', 'incoming_lineage')
      .leftJoinAndSelect(
        'incoming_lineage.from_global_unit',
        'incoming_lineage_from',
      )
      .leftJoinAndSelect(
        'incoming_lineage_from.parent_object',
        'incoming_lineage_from_parent',
      );

    let showIsActive = true;
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        showIsActive = option !== FindAllOptions.SHOW_ONLY_ACTIVE;
        qb.andWhere('gu.is_active = :isActive', {
          isActive: option === FindAllOptions.SHOW_ONLY_ACTIVE,
        });
        break;
      default:
        throw Error('?!');
    }

    const levelFilter = [1, 2];
    qb.andWhere('gu.level IN (:...levels)', { levels: levelFilter });

    const portfolioFilter = filters?.portfolioId ?? 3;
    qb.andWhere('gu.portfolio_id = :portfolioId', {
      portfolioId: portfolioFilter,
    });

    const typeId = this.resolveTypeFilter(filters?.type);
    if (typeId) {
      qb.andWhere('gu.global_unit_type_id = :typeId', { typeId });
    }

    const yearFilter = filters?.year ?? new Date().getFullYear();
    qb.andWhere('gu.year = :year', { year: yearFilter });

    qb.orderBy('gu.id', 'ASC');

    const entities = await qb.getMany();

    return this._cgiarEntityMapper.classListToDtoV2List(
      entities,
      showIsActive,
      false,
    );
  }

  private resolveTypeFilter(type?: string): number | undefined {
    if (!type) {
      return undefined;
    }

    const trimmed = type.trim();
    if (!trimmed) {
      return undefined;
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return numeric;
    }

    const option = CgiarEntityTypeOption.getfromPath(trimmed.toLowerCase());

    return option?.entity_type_id;
  }

  async findOneV2(id: number): Promise<CgiarEntityDtoV2> {
    const result = await this._cgiarEntityRepository.findOne({
      where: { id },
      relations: this._findOptionsV2.relations,
    });

    return this._cgiarEntityMapper.classToDtoV2(result, true);
  }

  async findByPortfolioV2(
    portfolioId: number,
    option: FindAllOptions = FindAllOptions.SHOW_ALL,
  ): Promise<CgiarEntityDtoV2[]> {
    let cgiarEntities: CgiarEntity[] = [];
    let showIsActive = true;
    const yearFilter = new Date().getFullYear();

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        cgiarEntities = await this._cgiarEntityRepository.find({
          relations: this._findOptionsV2.relations,
          where: {
            portfolio_object: In([portfolioId]),
            level: 1,
            year: yearFilter,
          },
        });
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        showIsActive = option !== FindAllOptions.SHOW_ONLY_ACTIVE;
        cgiarEntities = await this._cgiarEntityRepository.find({
          relations: this._findOptionsV2.relations,
          where: {
            portfolio_object: In([portfolioId]),
            level: 1,
            year: yearFilter,
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
      true,
    );
  }

  async getGlobalUnitsHierarchy(): Promise<any[]> {
    const currentYear = new Date().getFullYear();
    const parents = await this._cgiarEntityRepository.find({
      where: { level: 1, year: currentYear },
      relations: [
        'portfolio_object',
        'cgiar_entity_type_object',
        'children',
        'children.portfolio_object',
        'children.cgiar_entity_type_object',
      ],
      order: {
        portfolio_object: {
          start_date: 'DESC',
        },
        smo_code: 'ASC',
        children: {
          portfolio_object: {
            start_date: 'DESC',
          },
          smo_code: 'ASC',
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
