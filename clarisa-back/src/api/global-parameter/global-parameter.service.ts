import { Injectable } from '@nestjs/common';
import { GlobalParameterRepository } from './repositories/global-parameter.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class GlobalParameterService {
  constructor(private _globalParameterRepository: GlobalParameterRepository) {}

  findAll(option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE) {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this._globalParameterRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this._globalParameterRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._globalParameterRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  findOne(id: number) {
    return this._globalParameterRepository
      .findOneOrFail({
        where: {
          id,
          auditableFields: { is_active: true },
        },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._globalParameterRepository.target.toString(),
          id,
        );
      });
  }
}
