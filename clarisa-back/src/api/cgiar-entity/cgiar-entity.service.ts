import { Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, In, Like } from 'typeorm';
import { CgiarEntityTypeOption } from '../../shared/entities/enums/cgiar-entity-types';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { CgiarEntity } from './entities/cgiar-entity.entity';
import { CgiarEntityMapper } from './mappers/cgiar-entity.mapper';
import { CgiarEntityDto } from './dto/cgiar-entity.dto';
import { CgiarEntityRepository } from './repositories/cgiar-entity.repository';

@Injectable()
export class CgiarEntityService {
  constructor(
    private _cgiarEntityRepository: CgiarEntityRepository,
    private _cgiarEntityMapper: CgiarEntityMapper,
  ) {}

  async findAllWorkpackages(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    flagshipCode?: string,
  ): Promise<CgiarEntityDto[]> {
    const whereClause: FindOptionsWhere<CgiarEntity> = {
      cgiar_entity_type_object: {
        id: CgiarEntityTypeOption.WORKPACKAGES.entity_type_id,
      },
    };

    if (flagshipCode) {
      const flagship = await this.findFlagshipByCode(flagshipCode);
      whereClause.parent_object = { id: flagship.id };
    }

    return this.findEntities(
      whereClause,
      option === FindAllOptions.SHOW_ONLY_ACTIVE,
    ).then((ce) => ce.map((e) => this._cgiarEntityMapper.classToDto(e)));
  }

  async findAllInitiativeTree(): Promise<CgiarEntityDto[]> {
    const entities = await this.findAll_helper(FindAllOptions.SHOW_ONLY_ACTIVE);

    return this.getTreeFromType(
      CgiarEntityTypeOption.INITIATIVES,
      entities,
    ).then((ce) => ce.map((e) => this._cgiarEntityMapper.classToDto(e)));
  }

  private async getTreeFromNode(
    startingNode: CgiarEntity,
    allNodes: CgiarEntity[],
  ): Promise<CgiarEntity> {
    const children = allNodes.filter(
      (entity) => entity.parent_object?.id === startingNode.id,
    );

    if (children.length > 0) {
      const childPromises = children.map((child) =>
        this.getTreeFromNode(child, allNodes),
      );
      startingNode.children_array = await Promise.all(childPromises);
    }

    return startingNode;
  }

  private getTreeFromType(
    type: CgiarEntityTypeOption,
    allNodes: CgiarEntity[],
  ): Promise<CgiarEntity[]> {
    const roots = allNodes.filter(
      (entity) =>
        !entity.parent_id &&
        entity.cgiar_entity_type_object.id === type.entity_type_id,
    );

    const branches = roots.map((root) => this.getTreeFromNode(root, allNodes));

    return Promise.all(branches);
  }

  async findAllFlagships(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    initiativeCode?: string,
  ): Promise<CgiarEntityDto[]> {
    const whereClause: FindOptionsWhere<CgiarEntity> = {
      cgiar_entity_type_object: {
        id: CgiarEntityTypeOption.FLAGSHIPS.entity_type_id,
      },
    };

    if (initiativeCode) {
      const initiative = await this.findInitiativeByCode(initiativeCode);
      whereClause.parent_object = { id: initiative.id };
    }

    return this.findEntities(
      whereClause,
      option === FindAllOptions.SHOW_ONLY_ACTIVE,
    ).then((ce) => ce.map((e) => this._cgiarEntityMapper.classToDto(e)));
  }

  private async findAll_helper(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type?: string,
  ): Promise<CgiarEntity[]> {
    const typeOption: CgiarEntityTypeOption =
      CgiarEntityTypeOption.getfromPath(type);

    if (type && !typeOption) {
      throw new NotFoundException('Invalid entity type');
    }

    const whereClause: FindOptionsWhere<CgiarEntity> = typeOption
      ? { cgiar_entity_type_object: { id: typeOption.entity_type_id } }
      : {
          cgiar_entity_type_object: {
            id: In(
              CgiarEntityTypeOption.getCommonTypes().map(
                (cet) => cet.entity_type_id,
              ),
            ),
          },
        };

    return this.findEntities(
      whereClause,
      option === FindAllOptions.SHOW_ONLY_ACTIVE,
    );
  }

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type?: string,
  ): Promise<CgiarEntityDto[]> {
    return this.findAll_helper(option, type).then((ce) =>
      ce.map((e) => this._cgiarEntityMapper.classToDto(e)),
    );
  }

  async findOne(id: number): Promise<CgiarEntityDto> {
    const entity = await this._cgiarEntityRepository.findOne({
      where: { id, auditableFields: { is_active: true } },
    });

    if (!entity) {
      throw new NotFoundException(`Entity with id "${id}" not found`);
    }

    return this._cgiarEntityMapper.classToDto(entity);
  }

  private async findFlagshipByCode(code: string): Promise<CgiarEntity> {
    return this.findEntityByCode(CgiarEntityTypeOption.FLAGSHIPS, code);
  }

  private async findInitiativeByCode(code: string): Promise<CgiarEntity> {
    return this.findEntityByCode(CgiarEntityTypeOption.INITIATIVES, code);
  }

  private async findEntityByCode(
    entityType: CgiarEntityTypeOption,
    code: string,
  ): Promise<CgiarEntity> {
    const entity = await this._cgiarEntityRepository.findOne({
      where: {
        global_unit_type_id: entityType.entity_type_id,
        smo_code: Like(code),
      },
    });

    if (!entity) {
      throw new NotFoundException(
        `${entityType.path} not found with code ${code}`,
      );
    }

    return entity;
  }

  private async findEntities(
    whereClause: FindOptionsWhere<CgiarEntity>,
    isActive: boolean,
  ): Promise<CgiarEntity[]> {
    const entities = await this._cgiarEntityRepository.find({
      select: {
        id: true,
        name: true,
        acronym: true,
        smo_code: true,
        financial_code: true,
        institution_id: true,
        cgiar_entity_type_object: { id: true, name: true },
        parent_object: { id: true, name: true, smo_code: true },
      },
      where: isActive
        ? { ...whereClause, auditableFields: { is_active: true } }
        : whereClause,
      order: { smo_code: 'ASC' },
      relations: { cgiar_entity_type_object: true, parent_object: true },
    });

    return entities;
  }
}
