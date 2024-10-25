import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateGovernanceTypeDto } from './dto/update-governance-type.dto';
import { GovernanceType } from './entities/governance-type.entity';
import { GovernanceTypeRepository } from './repositories/governance-type.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class GovernanceTypeService {
  constructor(private _governanceTypesRepository: GovernanceTypeRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<GovernanceType[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._governanceTypesRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._governanceTypesRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._governanceTypesRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<GovernanceType> {
    return this._governanceTypesRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._governanceTypesRepository.target.toString(),
          id,
        );
      });
  }

  async update(updateGovernanceTypeDto: UpdateGovernanceTypeDto[]) {
    return await this._governanceTypesRepository.save(updateGovernanceTypeDto);
  }
}
