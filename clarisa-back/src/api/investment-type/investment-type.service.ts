import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateInvestmentTypeDto } from './dto/update-investment-type.dto';
import { InvestmentType } from './entities/investment-type.entity';
import { InvestmentTypeRepository } from './repositories/investment-type.repository';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';
import { FindOptionsSelect } from 'typeorm';

@Injectable()
export class InvestmentTypeService {
  constructor(private investmentTypeRepository: InvestmentTypeRepository) {}
  private readonly _select: FindOptionsSelect<InvestmentType> = {
    id: true,
    name: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BasicDtoV1[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.investmentTypeRepository.find({
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.investmentTypeRepository.find({
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
    return await this.investmentTypeRepository.findOne({
      where: { id, auditableFields: { is_active: true } },
      select: this._select,
    });
  }

  async update(
    updateInvestmentTypeDtoList: UpdateInvestmentTypeDto[],
  ): Promise<InvestmentType[]> {
    return await this.investmentTypeRepository.save(
      updateInvestmentTypeDtoList,
    );
  }
}
