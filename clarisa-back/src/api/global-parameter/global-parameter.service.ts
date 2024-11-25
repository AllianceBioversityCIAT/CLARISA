import { Injectable } from '@nestjs/common';
import { GlobalParameterRepository } from './repositories/global-parameter.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

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
        throw Error('?!');
    }
  }

  findOne(id: number) {
    return this._globalParameterRepository.findOne({
      where: {
        id,
        auditableFields: { is_active: true },
      },
    });
  }
}
