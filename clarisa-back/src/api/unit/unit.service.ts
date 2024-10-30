import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UnitDto } from './dto/unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Unit } from './entities/unit.entity';
import { UnitRepository } from './repositories/unit.repository';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class UnitService {
  constructor(private _unitsRepository: UnitRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<UnitDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    return this._unitsRepository.findUnits(option);
  }

  async findOne(id: number): Promise<UnitDto> {
    return this._unitsRepository.findUnitById(id).catch(() => {
      throw ClarisaEntityNotFoundError.forId(
        this._unitsRepository.target.toString(),
        id,
      );
    });
  }

  async update(updateUserDtoList: UpdateUnitDto[]): Promise<Unit[]> {
    return await this._unitsRepository.save(updateUserDtoList);
  }
}
