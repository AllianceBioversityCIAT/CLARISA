import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UserRepository } from './repositories/user.repository';
import { Immutable } from '../../shared/utils/deep-immutable';

@Injectable()
export class UserService {
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  constructor(private usersRepository: UserRepository) {}

  findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<User[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this.usersRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this.usersRepository.find({
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

  async findOne(id: number): Promise<User | null> {
    return await this.usersRepository.findOneBy({ id });
  }

  async getUserPermissions(
    user: Immutable<{} & { id: number | string }>,
  ): Promise<string[] | null> {
    const permissions_result: unknown[] = (await this.usersRepository.query(
      'call getUserPermissions(?)',
      [user.id],
    )) as unknown[];

    let permissions: string[] = [];

    /* eslint-disable @typescript-eslint/no-magic-numbers */
    if (permissions_result[0]?.constructor.name === Array.name) {
      permissions = (
        permissions_result[0] as ({} & { permission_route: string })[]
      )
        .map((rdp) => rdp.permission_route)
        .filter((p) => p);
    }

    return permissions.length === 0 ? null : permissions;
    /* eslint-enable @typescript-eslint/no-magic-numbers */
  }

  /**
   * Finds an user by their email
   * @param email the user's email
   * @param isService true if this method is being invoked by a service,
   * false if it's being called from the auth module
   * @returns an user or empty, if not found.
   */
  async findOneByEmail(email: string, isService = true): Promise<User | null> {
    return this.usersRepository.findOneBy({ email }).then((user) => {
      if (user) {
        return this.getUserPermissions(user).then((permissions) => {
          user.permissions = permissions as string[] | undefined;
          if (isService) {
            delete user.password;
          }
          return user;
        });
      }

      return user;
    });
  }

  /**
   * Finds an user by their username
   * @param username the user's username
   * @param isService true if this method is being invoked by a service,
   * false if it's being called from the auth module
   * @returns an user or empty, if not found.
   */
  async findOneByUsername(
    username: string,
    isService = false,
  ): Promise<User | null> {
    return this.usersRepository.findOneBy({ username }).then((user) => {
      if (user) {
        return this.getUserPermissions(user).then((permissions) => {
          user.permissions = permissions as string[] | undefined;
          if (isService) {
            delete user.password;
          }
          return user;
        });
      }

      return user;
    });
  }

  async update(updateUserDtoList: Immutable<UpdateUserDto[]>): Promise<User[]> {
    return await this.usersRepository.save(
      updateUserDtoList as UpdateUserDto[],
    );
  }
}
