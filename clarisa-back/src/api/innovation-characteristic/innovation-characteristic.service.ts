import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { InnovationCharacteristic } from './entities/innovation-characteristic.entity';
import { InnovationCharacteristicRepository } from './repositories/innovation-characteristic.repository';
import { InnovationCharacteristicDto } from './dto/innovation-characteristic.dto';
import { FindOptionsSelect } from 'typeorm';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class InnovationCharacteristicService {
  constructor(
    private _innovationCharacteristicsRepository: InnovationCharacteristicRepository,
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
        return await this._innovationCharacteristicsRepository.find({
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._innovationCharacteristicsRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          select: this._select,
        });
      default:
        throw new BadParamsError(
          this._innovationCharacteristicsRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<InnovationCharacteristicDto> {
    return await this._innovationCharacteristicsRepository
      .findOneOrFail({
        where: { id, auditableFields: { is_active: true } },
        select: this._select,
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._innovationCharacteristicsRepository.target.toString(),
          id,
        );
      });
  }
}
