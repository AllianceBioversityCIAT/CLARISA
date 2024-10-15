import { Injectable } from '@nestjs/common';
import { LeverRepository } from './repositories/lever.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Lever } from './entities/lever.entity';

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
        throw Error('?!');
    }

    return response;
  }

  async findOne(id: number): Promise<Lever> {
    return await this._leversRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }
}
