import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { SourceOption } from '../../../shared/entities/enums/source-options';
import { InstitutionTypeFromParentDto } from '../dto/institution-type-from-parent.dto';
import { InstitutionTypeDto } from '../dto/institution-type.dto';
import { InstitutionType } from '../entities/institution-type.entity';

@Injectable()
export class InstitutionTypeRepository extends Repository<InstitutionType> {
  constructor(private dataSource: DataSource) {
    super(InstitutionType, dataSource.createEntityManager());
  }

  async findAllTypesFromChildrenToParent(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type: string = SourceOption.CGIAR.path,
  ): Promise<InstitutionTypeDto[]> {
    let institutionTypeDtos: InstitutionTypeDto[] = [];
    let whereClause: FindOptionsWhere<InstitutionType> = {};
    const incomingType = SourceOption.getfromPath(type);

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
        break;
    }
    switch (type) {
      case SourceOption.ALL.path:
        // do nothing. no extra conditions needed
        break;
      case SourceOption.CGIAR.path:
      case SourceOption.LEGACY.path:
        whereClause = {
          ...whereClause,
          source_id: incomingType.source_id,
        };
        break;
      default:
        throw Error('?!');
    }

    const institutionTypes: InstitutionType[] = (
      await this.find({
        where: whereClause,
        relations: {
          parent_object: {
            parent_object: true,
          },
          children: true,
        },
      })
    ).filter((it) => it.children?.length === 0);

    institutionTypeDtos = await Promise.all(
      institutionTypes.map(async (it) => {
        const newInstitutionType = new InstitutionTypeDto();
        newInstitutionType.code = it.id;
        newInstitutionType.name = it.name;
        newInstitutionType.description = it.description;

        if (incomingType == SourceOption.ALL) {
          newInstitutionType.legacy = it.source_id === 2;
        }

        if (it.parent_object) {
          newInstitutionType.parent = new InstitutionTypeDto();
          newInstitutionType.parent.code = it.parent_object.id;
          newInstitutionType.parent.name = it.parent_object.name;

          if (it.parent_object.parent_object) {
            newInstitutionType.parent.parent = new InstitutionTypeDto();
            newInstitutionType.parent.parent.code =
              it.parent_object.parent_object.id;
            newInstitutionType.parent.parent.name =
              it.parent_object.parent_object.name;
          }
        }

        return newInstitutionType;
      }),
    );

    return institutionTypeDtos;
  }

  async findAllTypesFromParentToChildren(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type: string = SourceOption.CGIAR.path,
  ): Promise<InstitutionTypeFromParentDto[]> {
    let institutionTypeDtos: InstitutionTypeFromParentDto[] = [];
    let whereClause: FindOptionsWhere<InstitutionType> = {};
    const incomingType = SourceOption.getfromPath(type);

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
        break;
    }
    switch (type) {
      case SourceOption.ALL.path:
        // do nothing. no extra conditions needed
        break;
      case SourceOption.CGIAR.path:
      case SourceOption.LEGACY.path:
        whereClause = {
          ...whereClause,
          source_id: incomingType.source_id,
        };
        break;
      default:
        throw Error('?!');
    }

    const institutionTypes: InstitutionType[] = (
      await this.find({
        where: whereClause,
        relations: {
          children: {
            children: true,
          },
          parent_object: true,
        },
      })
    ).filter((it) => !it.parent_object);

    institutionTypeDtos = await Promise.all(
      institutionTypes.map(async (it) => {
        const newInstitutionType = new InstitutionTypeFromParentDto();
        newInstitutionType.code = `${it.id}`;
        newInstitutionType.name = it.name;
        newInstitutionType.description = it.description;

        if (it.children?.length > 0) {
          newInstitutionType.children = this.fillChildren(it);
        }

        return newInstitutionType;
      }),
    );

    return institutionTypeDtos;
  }

  private fillChildren(
    institutionType: InstitutionType,
  ): InstitutionTypeFromParentDto[] {
    if (institutionType.children?.length === 0) {
      return undefined;
    }

    const children = (institutionType.children ?? []).map((ch) => {
      const child: InstitutionTypeFromParentDto =
        new InstitutionTypeFromParentDto();

      child.code = `${ch.id}`;
      child.name = ch.name;

      child.children = this.fillChildren(ch);

      return child;
    });

    return children;
  }
}
