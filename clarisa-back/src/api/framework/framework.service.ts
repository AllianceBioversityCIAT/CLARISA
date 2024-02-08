import { Injectable } from '@nestjs/common';
import { FrameworkRepository } from './repositories/framework.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { FindOptionsWhere } from 'typeorm';
import { Framework } from './entities/framework.entity';
import { FrameworkDto } from './dto/framework.dto';

@Injectable()
export class FrameworkService {
  constructor(private _frameworkRepository: FrameworkRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<FrameworkDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    let whereClause: FindOptionsWhere<Framework> = {};
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
        break;
    }

    const frameworks: Framework[] = await this._frameworkRepository.find({
      select: {
        id: true,
        name: true,
        description: true,
        currently_in_use: true,
      },
      where: whereClause,
    });

    return frameworks;
  }

  async findOne(id: number): Promise<Framework> {
    return await this._frameworkRepository.findOne({
      select: {
        id: true,
        name: true,
        description: true,
        currently_in_use: true,
      },
      where: {
        id,
        auditableFields: { is_active: true },
      },
    });
  }
}
