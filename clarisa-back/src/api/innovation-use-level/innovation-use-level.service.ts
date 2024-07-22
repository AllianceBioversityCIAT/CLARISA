import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateInnovationUseLevelDto } from './dto/update-innovation-use-level.dto';
import { InnovationUseLevel } from './entities/innovation-use-level.entity';
import { InnovationUseLevelRepository } from './repositories/innovation-use-level.repository';
import { FindOptionsSelect } from 'typeorm';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';

@Injectable()
export class InnovationUseLevelService {
  constructor(
    private innovationUseLevelRepository: InnovationUseLevelRepository,
  ) {}
  private readonly _select: FindOptionsSelect<InnovationUseLevel> = {
    id: true,
    name: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BasicDtoV1[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.innovationUseLevelRepository.find({
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.innovationUseLevelRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          select: this._select,
        });
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<BasicDtoV1> {
    return await this.innovationUseLevelRepository.findOne({
      where: { id, auditableFields: { is_active: true } },
      select: this._select,
    });
  }

  async update(
    updateInnovationUseLevelDtoList: UpdateInnovationUseLevelDto[],
  ): Promise<InnovationUseLevel[]> {
    return await this.innovationUseLevelRepository.save(
      updateInnovationUseLevelDtoList,
    );
  }
}
