import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateInvestmentTypeDto } from './dto/update-investment-type.dto';
import { InvestmentType } from './entities/investment-type.entity';
import { InvestmentTypeRepository } from './repositories/investment-type.repository';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';
import { FindOptionsSelect } from 'typeorm';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class InvestmentTypeService {
  constructor(private _investmentTypeRepository: InvestmentTypeRepository) {}
  private readonly _select: FindOptionsSelect<InvestmentType> = {
    id: true,
    name: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BasicDtoV1[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._investmentTypeRepository.find({
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._investmentTypeRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          select: this._select,
        });
      default:
        throw new BadParamsError(
          this._investmentTypeRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<BasicDtoV1> {
    return this._investmentTypeRepository
      .findOneOrFail({
        where: { id, auditableFields: { is_active: true } },
        select: this._select,
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._investmentTypeRepository.target.toString(),
          id,
        );
      });
  }

  async update(
    updateInvestmentTypeDtoList: UpdateInvestmentTypeDto[],
  ): Promise<InvestmentType[]> {
    return await this._investmentTypeRepository.save(
      updateInvestmentTypeDtoList,
    );
  }
}
