import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Role } from './entities/role.entity';
import { RoleRepository } from './repositories/role.repository';

@Injectable()
export class RoleService {
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  constructor(private rolesRepository: RoleRepository) {}

  findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<Role[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this.rolesRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this.rolesRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw Error('?!');
    }
  }

  findOne(id: number): Promise<Role | null> {
    return this.rolesRepository.findOneBy({ id });
  }
}
