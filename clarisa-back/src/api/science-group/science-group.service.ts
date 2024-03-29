import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ScienceGroupDto } from './dto/science-group.dto';
import { UpdateScienceGroupDto } from './dto/update-science-group.dto';
import { ScienceGroup } from './entities/science-group.entity';
import { ScienceGroupRepository } from './repositories/science-group.repository';

@Injectable()
export class ScienceGroupService {
  constructor(private scienceGroupsRepository: ScienceGroupRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ScienceGroupDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    return this.scienceGroupsRepository.findAllScienceGroups(option);
  }

  async findOne(id: number): Promise<ScienceGroup> {
    return await this.scienceGroupsRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(
    updateUserDtoList: UpdateScienceGroupDto[],
  ): Promise<ScienceGroup[]> {
    return await this.scienceGroupsRepository.save(updateUserDtoList);
  }
}
