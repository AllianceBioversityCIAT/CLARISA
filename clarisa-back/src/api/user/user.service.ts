import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { FindAllOptions } from 'src/shared/entities/enums/find-all-options';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

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
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        });
      default:
        throw Error('?!');
    }
  }

  async getUsersPagination(offset?: number, limit = 10) {
    const [items, count] = await this.usersRepository.findAndCount({
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
    return await this.usersRepository.findOneBy({ id });
  }

  async getUserPermissions(user: User): Promise<string[] | undefined> {
    const permissions_result: any = await this.usersRepository.query(
      'call getUserPermissions(?)',
      [user.id],
    );

    let permissions: string[] = [];

    if (permissions_result[0]?.constructor.name === Array.name) {
      permissions = permissions_result[0]
        .map((rdp) => rdp.permission_route as string)
        .filter((p) => p);
    }

    return permissions.length == 0 ? undefined : permissions;
  }

  /**
   * Finds an user by their email
   * @param email the user's email
   * @param isService true if this method is being invoked by a service,
   * false if it's being called from the auth module
   * @returns an user or empty, if not found.
   */
  async findOneByEmail(email: string, isService = true): Promise<User> {
    const user: User = await this.usersRepository.findOneBy({ email });
    if (user) {
      user.permissions = await this.getUserPermissions(user);
    }

    if (isService) {
      delete user.password;
    }

    return user;
  }

  /**
   * Finds an user by their username
   * @param username the user's username
   * @param isService true if this method is being invoked by a service,
   * false if it's being called from the auth module
   * @returns an user or empty, if not found.
   */
  async findOneByUsername(username: string, isService = false): Promise<User> {
    const user: User = await this.usersRepository.findOneBy({ username });
    user.permissions = await this.getUserPermissions(user);
    if (user) {
      user.permissions = await this.getUserPermissions(user);
    }

    if (isService) {
      delete user.password;
    }

    return user;
  }

  async update(updateUserDtoList: UpdateUserDto[]): Promise<User[]> {
    return await this.usersRepository.save(updateUserDtoList);
  }
}
