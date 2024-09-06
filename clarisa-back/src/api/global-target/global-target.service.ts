import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateGlobalTargetDto } from './dto/update-global-target.dto';
import { GlobalTarget } from './entities/global-target.entity';
import { GlobalTargetRepository } from './repositories/global-target.repository';

@Injectable()
export class GlobalTargetService {
  constructor(private globalTargetRepository: GlobalTargetRepository) {}

  findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<GlobalTarget[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this.globalTargetRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this.globalTargetRepository.find({
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

  async findOne(id: number): Promise<GlobalTarget> {
    return await this.globalTargetRepository.findOneBy({ id });
  }

  async update(
    updateUserDtoList: UpdateGlobalTargetDto[],
  ): Promise<GlobalTarget[]> {
    return await this.globalTargetRepository.save(updateUserDtoList);
  }
}
