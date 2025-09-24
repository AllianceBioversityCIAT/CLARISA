import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { CgiarEntityTypeRepository } from '../cgiar-entity-type/repositories/cgiar-entity-type.repository';

type VersionedGlobalUnitSlug = 'aows' | 'sps';

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
        to_global_unit: true,
      },
      incoming_lineages: {
        from_global_unit: true,
      },
    },
  };

  private readonly versionedSlugConfig: Record<
    VersionedGlobalUnitSlug,
    {
      prefixes: string[];
      names: string[];
    }
  > = {
    aows: {
      prefixes: ['AoW', 'AOW'],
      names: ['Area of Work', 'Areas of Work'],
    },
    sps: {
      prefixes: ['SP'],
      names: ['Strategic Program', 'Strategic Programme', 'Strategic Programs'],
    },
  };

  constructor(
    private readonly _cgiarEntityRepository: CgiarEntityRepository,
    private readonly _centerService: CenterService,
    private readonly _cgiarEntityMapper: CgiarEntityMapper,
    private readonly _cgiarEntityTypeRepository: CgiarEntityTypeRepository,
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

  async findByPortfolioV2(
    portfolioId: number,
    option: FindAllOptions = FindAllOptions.SHOW_ALL,
  ): Promise<CgiarEntityDtoV2[]> {
    let cgiarEntities: CgiarEntity[] = [];
    let showIsActive = true;

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        cgiarEntities = await this._cgiarEntityRepository.find({
          relations: this._findOptionsV2.relations,
          where: { portfolio_object: In([portfolioId]), level: 1 },
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

  async findAoWsByYear(
    year: number,
    options?: { latest?: boolean },
  ): Promise<{ items: CgiarEntityDtoV2[]; latestYear?: number }> {
    return this.findVersionedEntitiesBySlug('aows', year, options);
  }

  async findStrategicProgramsByYear(
    year: number,
    options?: { latest?: boolean },
  ): Promise<{ items: CgiarEntityDtoV2[]; latestYear?: number }> {
    return this.findVersionedEntitiesBySlug('sps', year, options);
  }

  private ensureValidYear(year: number): void {
    if (!Number.isInteger(year) || year < 1900 || year > 9999) {
      throw new BadRequestException('Year must be a valid four-digit number');
    }
  }

  private async resolveVersionedTypeIds(
    slug: VersionedGlobalUnitSlug,
  ): Promise<number[]> {
    const config = this.versionedSlugConfig[slug];
    const staticOption = CgiarEntityTypeOption.getfromPath(slug);

    const candidateIds = new Set<number>();

    if (staticOption) {
      candidateIds.add(staticOption.entity_type_id);
    }

    if (config) {
      const prefixes = Array.from(
        new Set((config.prefixes || []).map((prefix) => prefix.toLowerCase())),
      );
      const names = Array.from(
        new Set((config.names || []).map((name) => name.toLowerCase())),
      );

      if (prefixes.length || names.length) {
        const qb = this._cgiarEntityTypeRepository
          .createQueryBuilder('gut')
          .where('0 = 1');

        if (prefixes.length) {
          qb.orWhere('LOWER(gut.prefix) IN (:...prefixes)', { prefixes });
        }

        if (names.length) {
          qb.orWhere('LOWER(gut.name) IN (:...names)', { names });
        }

        const matches = await qb.getMany();
        matches.forEach((match) => candidateIds.add(match.id));
      }
    }

    return Array.from(candidateIds);
  }

  private async findVersionedEntitiesBySlug(
    slug: VersionedGlobalUnitSlug,
    year: number,
    options?: { latest?: boolean },
  ): Promise<{ items: CgiarEntityDtoV2[]; latestYear?: number }> {
    if (year === undefined || year === null) {
      throw new BadRequestException(
        'Year is required for versioned global units',
      );
    }

    this.ensureValidYear(year);

    const typeIds = await this.resolveVersionedTypeIds(slug);

    if (!typeIds.length) {
      throw new NotFoundException(
        `Global unit types for slug "${slug}" are not configured`,
      );
    }

    const latest = options?.latest ?? false;

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
      .leftJoinAndSelect('gu.incoming_lineages', 'incoming_lineage')
      .leftJoinAndSelect(
        'incoming_lineage.from_global_unit',
        'incoming_lineage_from',
      )
      .where('gu.global_unit_type_id IN (:...typeIds)', { typeIds })
      .andWhere('gu.is_active = :isActive', { isActive: true })
      .orderBy('gu.smo_code', 'ASC');

    if (latest) {
      const latestPerCodeSubQuery = qb
        .subQuery()
        .select('latest.smo_code', 'smo_code')
        .addSelect('MAX(latest.year)', 'max_year')
        .from(CgiarEntity, 'latest')
        .where('latest.global_unit_type_id IN (:...typeIds)')
        .andWhere('latest.year IS NOT NULL')
        .andWhere('latest.is_active = :isActive')
        .groupBy('latest.smo_code')
        .getQuery();

      qb.innerJoin(
        latestPerCodeSubQuery,
        'latest_per_code',
        'latest_per_code.smo_code = gu.smo_code AND latest_per_code.max_year = gu.year',
      )
        .andWhere('gu.year IS NOT NULL')
        .addOrderBy('gu.year', 'DESC');

      const entities = await qb.getMany();
      const items = this._cgiarEntityMapper.classListToDtoV2List(entities);

      const latestYear = entities.reduce<number | undefined>((acc, entity) => {
        if (entity.year === null || entity.year === undefined) {
          return acc;
        }
        if (acc === undefined || entity.year > acc) {
          return entity.year;
        }
        return acc;
      }, undefined);

      return { items, latestYear };
    }

    qb.andWhere('gu.year = :year', { year }).addOrderBy('gu.name', 'ASC');

    const entities = await qb.getMany();
    const items = this._cgiarEntityMapper.classListToDtoV2List(entities);

    return { items };
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
