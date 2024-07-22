import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UnitDto } from './dto/unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Unit } from './entities/unit.entity';
import { UnitRepository } from './repositories/unit.repository';

@Injectable()
export class UnitService {
  constructor(private unitsRepository: UnitRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<UnitDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    return this.unitsRepository.findUnits(option);
  }

  async findOne(id: number): Promise<UnitDto> {
    const result = await this.unitsRepository.findUnits(
      FindAllOptions.SHOW_ALL,
      id,
    );

    return result.length === 1 ? result[0] : null;
  }

  async update(updateUserDtoList: UpdateUnitDto[]): Promise<Unit[]> {
    return await this.unitsRepository.save(updateUserDtoList);
  }
}
