import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { InnovationCharacteristic } from './entities/innovation-characteristic.entity';
import { InnovationCharacteristicRepository } from './repositories/innovation-characteristic.repository';
import { InnovationCharacteristicDto } from './dto/innovation-characteristic.dto';
import { FindOptionsSelect } from 'typeorm';

@Injectable()
export class InnovationCharacteristicService {
  constructor(
    private innovationCharacteristicsRepository: InnovationCharacteristicRepository,
  ) {}
  private readonly _select: FindOptionsSelect<InnovationCharacteristic> = {
    id: true,
    name: true,
    definition: true,
    source_id: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<InnovationCharacteristicDto[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.innovationCharacteristicsRepository.find({
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.innovationCharacteristicsRepository.find({
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

  async findOne(id: number): Promise<InnovationCharacteristicDto> {
    return await this.innovationCharacteristicsRepository.findOne({
      where: { id, auditableFields: { is_active: true } },
      select: this._select,
    });
  }
}
