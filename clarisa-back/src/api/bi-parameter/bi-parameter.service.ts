import { Injectable } from '@nestjs/common/decorators';
import { FindOptionsWhere } from 'typeorm';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateBiParameterDto } from './dto/update-bi-parameter.dto';
import { BiParameter } from './entities/bi-parameter.entity';
import { BiParameterRepository } from './repositories/bi-parameter.repository';
import { ParametersBiUnit } from './dto/parameter-unit-bi.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
@Injectable()
export class BiParameterService {
  constructor(private _biParametersRepository: BiParameterRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BiParameter[]> {
    let whereClause: FindOptionsWhere<BiParameter> = {};

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._biParametersRepository.find({
          where: whereClause,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          ...whereClause,
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
        return await this._biParametersRepository.find({
          where: whereClause,
        });
      default:
        throw new BadParamsError(
          this._biParametersRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<BiParameter> {
    return await this._biParametersRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw new ClarisaEntityNotFoundError(
          this._biParametersRepository.target.toString(),
          id,
        );
      });
  }

  async update(updateBiParameterDto: UpdateBiParameterDto[]) {
    return await this._biParametersRepository.save(updateBiParameterDto);
  }

  async findAllUnitParametersBi(): Promise<ParametersBiUnit> {
    return await this._biParametersRepository.getFindAllInformation();
  }
}
