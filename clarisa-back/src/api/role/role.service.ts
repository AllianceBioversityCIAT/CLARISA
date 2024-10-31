import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Role } from './entities/role.entity';
import { RoleRepository } from './repositories/role.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class RoleService {
  constructor(private _rolesRepository: RoleRepository) {}

  findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<Role[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this._rolesRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this._rolesRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._rolesRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number) {
    return this._rolesRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._rolesRepository.target.toString(),
          id,
        );
      });
  }

  async getRolesPagination(offset?: number, limit = 10) {
    const [items, count] = await this._rolesRepository.findAndCount({
      order: {
        id: 'ASC',
      },
      skip: offset,
      take: limit,
    });

    return {
      items,
      count,
    };
  }
}
