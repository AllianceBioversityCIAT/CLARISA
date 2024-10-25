import { Injectable } from '@nestjs/common';
import { LeverRepository } from './repositories/lever.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Lever } from './entities/lever.entity';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class LeverService {
  constructor(private readonly _leversRepository: LeverRepository) {}

  async findAll(option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE) {
    let response: Lever[];
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        response = await this._leversRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        response = await this._leversRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw new BadParamsError(
          this._leversRepository.target.toString(),
          'option',
          option,
        );
    }

    return response;
  }

  async findOne(id: number): Promise<Lever> {
    return this._leversRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._leversRepository.target.toString(),
          id,
        );
      });
  }
}
