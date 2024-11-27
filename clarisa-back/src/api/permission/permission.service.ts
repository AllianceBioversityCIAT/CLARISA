import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Permission } from './entities/permission.entity';
import { PermissionRepository } from './repositories/permission.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { FindOptionsWhere } from 'typeorm';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class PermissionService {
  constructor(private _permissionRepository: PermissionRepository) {}

  async findAll(option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE) {
    let whereClause: FindOptionsWhere<Permission> = {};
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
      default:
        throw new BadParamsError(
          this._permissionRepository.target.toString(),
          'option',
          option,
        );
    }

    return this._permissionRepository.find({
      where: whereClause,
      select: {
        id: true,
        name: true,
      },
    }) as Promise<BasicDtoV1[]>;
  }

  async findOne(id: number): Promise<BasicDtoV1> {
    return (
      this._permissionRepository.findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      }) as Promise<BasicDtoV1>
    ).catch(() => {
      throw ClarisaEntityNotFoundError.forId(
        this._permissionRepository.target.toString(),
        id,
      );
    });
  }
}
