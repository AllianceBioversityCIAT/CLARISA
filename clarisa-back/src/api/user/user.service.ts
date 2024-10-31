import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UserDataDto } from '../../shared/entities/dtos/user-data.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class UserService {
  constructor(private _usersRepository: UserRepository) {}

  create(userData: UserDataDto, createUserDto: CreateUserDto) {
    if (!createUserDto) {
      throw new Error('Missing required data');
    } else if (!createUserDto.email) {
      throw new Error('Missing user email');
    } else if (!createUserDto.roles || createUserDto.roles.length == 0) {
      throw new Error('Missing user roles');
    }
    // TODO: implement the rest of the method
  }

  findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<User[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this._usersRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this._usersRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._usersRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async getUsersPagination(offset?: number, limit = 10) {
    const [items, count] = await this._usersRepository.findAndCount({
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

  async findOne(id: number): Promise<User> {
    return this._usersRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._usersRepository.target.toString(),
          id,
        );
      });
  }

  async getUserPermissions(user: User): Promise<string[] | undefined> {
    const [permissions_result]: [{ permission_route: string }[], any] =
      await this._usersRepository.query('call getUserPermissions(?)', [
        user.id,
      ]);

    return (permissions_result ?? [])
      .map((rdp) => rdp.permission_route)
      .filter((p) => p);
  }

  /**
   * Finds an user by their email
   * @param email the user's email
   * @param isService true if this method is being invoked by a service,
   * false if it's being called from the auth module
   * @returns an user or empty, if not found.
   */
  async findOneByEmail(email: string, isService = true): Promise<User> {
    return this._usersRepository
      .findOneByOrFail({
        email,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forSingleParam(
          this._usersRepository.target.toString(),
          'email',
          email,
        );
      })
      .then((user) => {
        return this.getUserPermissions(user).then((permissions) => {
          user.permissions = permissions;

          if (isService) {
            delete user.password;
          }

          return user;
        });
      });
  }

  /**
   * Finds an user by their username
   * @param username the user's username
   * @param isService true if this method is being invoked by a service,
   * false if it's being called from the auth module
   * @returns an user or empty, if not found.
   */
  async findOneByUsername(username: string, isService = true): Promise<User> {
    return this._usersRepository
      .findOneByOrFail({
        username,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forSingleParam(
          this._usersRepository.target.toString(),
          'username',
          username,
        );
      })
      .then((user) => {
        return this.getUserPermissions(user).then((permissions) => {
          user.permissions = permissions;

          if (isService) {
            delete user.password;
          }

          return user;
        });
      });
  }

  async update(updateUserDtoList: UpdateUserDto[]): Promise<User[]> {
    return await this._usersRepository.save(updateUserDtoList);
  }
}
