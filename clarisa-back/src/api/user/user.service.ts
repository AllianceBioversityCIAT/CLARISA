import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FindAllOptions } from 'src/shared/entities/enums/find-all-options';

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

  async getUsersPagination(offset?: number, limit: number = 10) {
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

  /**
   * Finds an user by their email
   * @param email the user's email
   * @param isService true if this method is being invoked by a service,
   * false if it's being called from the auth module
   * @returns an user or empty, if not found.
   */
  async findOneByEmail(
    email: string,
    isService: boolean = true,
  ): Promise<User> {
    const user: User = await this.usersRepository.findOneBy({ email });
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
  async findOneByUsername(
    username: string,
    isService: boolean = false,
  ): Promise<User> {
    const user: User = await this.usersRepository.findOneBy({ username });
    if (isService) {
      delete user.password;
    }

    return user;
  }

  async update(updateUserDtoList: UpdateUserDto[]): Promise<User[]> {
    return await this.usersRepository.save(updateUserDtoList);
  }
}
