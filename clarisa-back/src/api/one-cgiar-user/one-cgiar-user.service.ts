import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateOneCgiarUserDto } from './dto/update-one-cgiar-user.dto';
import { OneCgiarUser } from './entities/one-cgiar-user.entity';
import { OneCgiarUserRepository } from './repositories/one-cgiar-user.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class OneCgiarUserService {
  constructor(private _oneCgiarUserRepository: OneCgiarUserRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<OneCgiarUser[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._oneCgiarUserRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._oneCgiarUserRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._oneCgiarUserRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<OneCgiarUser> {
    return this._oneCgiarUserRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._oneCgiarUserRepository.target.toString(),
          id,
        );
      });
  }

  async update(
    updateOneCgiarUserlDtoList: UpdateOneCgiarUserDto[],
  ): Promise<OneCgiarUser[]> {
    return await this._oneCgiarUserRepository.save(updateOneCgiarUserlDtoList);
  }
}
