import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';
import { Beneficiary } from './entities/beneficiary.entity';
import { BeneficiaryRepository } from './repositories/beneficiary.repository';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic-dto.v1';

@Injectable()
export class BeneficiaryService {
  constructor(private beneficiaryRepository: BeneficiaryRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BasicDtoV1[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this.beneficiaryRepository.find() as Promise<BasicDtoV1[]>;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this.beneficiaryRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        }) as Promise<BasicDtoV1[]>;
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<Beneficiary> {
    return this.beneficiaryRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(
    updateBeneficiaryDtoList: UpdateBeneficiaryDto[],
  ): Promise<Beneficiary[]> {
    return await this.beneficiaryRepository.save(updateBeneficiaryDtoList);
  }
}
