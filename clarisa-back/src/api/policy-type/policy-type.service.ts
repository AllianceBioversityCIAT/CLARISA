import { Injectable } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SourceOption } from '../../shared/entities/enums/source-options';
import { UpdatePolicyTypeDto } from './dto/update-policy-type.dto';
import { PolicyType } from './entities/policy-type.entity';
import { PolicyTypeRepository } from './repositories/policy-type.repository';
import { PolicyTypeDto } from './dto/policy-type.dto';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
import { BadParamsError } from '../../shared/errors/bad-params.error';

@Injectable()
export class PolicyTypeService {
  constructor(private policyTypesRepository: PolicyTypeRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type: string = SourceOption.ONE_CGIAR.path,
  ): Promise<PolicyTypeDto[]> {
    let whereClause: FindOptionsWhere<PolicyType> = {};
    const incomingType = SourceOption.getfromPath(type);

    switch (type) {
      case SourceOption.ALL.path:
        // do nothing. no extra conditions needed
        break;
      case SourceOption.ONE_CGIAR.path:
        whereClause = {
          ...whereClause,
          source_id: incomingType.source_id,
        };
        break;
      default:
        throw new BadParamsError(
          this.policyTypesRepository.target.toString(),
          'type',
          type,
        );
    }

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.policyTypesRepository.find({
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
        return await this.policyTypesRepository.find({
          where: whereClause,
        });
      default:
        throw new BadParamsError(
          this.policyTypesRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<PolicyTypeDto> {
    return await this.policyTypesRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this.policyTypesRepository.target.toString(),
          id,
        );
      });
  }

  async update(updatePolicyTypeDto: UpdatePolicyTypeDto[]) {
    return await this.policyTypesRepository.save(updatePolicyTypeDto);
  }
}
