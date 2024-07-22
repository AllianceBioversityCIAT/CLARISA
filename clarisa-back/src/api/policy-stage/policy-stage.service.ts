import { Injectable } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SourceOption } from '../../shared/entities/enums/source-options';
import { UpdatePolicyStageDto } from './dto/update-policy-stage.dto';
import { PolicyStage } from './entities/policy-stage.entity';
import { PolicyStageRepository } from './repositories/policy-stage.repository';
import { PolicyStageDto } from './dto/policy-stage.dto';

@Injectable()
export class PolicyStageService {
  constructor(private policyStagesRepository: PolicyStageRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type: string = SourceOption.ONE_CGIAR.path,
  ): Promise<PolicyStageDto[]> {
    let whereClause: FindOptionsWhere<PolicyStage> = {};
    const incomingType = SourceOption.getfromPath(type);

    switch (type) {
      case SourceOption.ALL.path:
        // do nothing. no extra conditions needed
        break;
      case SourceOption.ONE_CGIAR.path:
      case SourceOption.LEGACY.path:
        whereClause = {
          ...whereClause,
          source_id: incomingType.source_id,
        };
        break;
      default:
        throw Error('?!');
    }

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.policyStagesRepository.find({
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
        return await this.policyStagesRepository.find({
          where: whereClause,
        });
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<PolicyStageDto> {
    return await this.policyStagesRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(updatePolicyStageDto: UpdatePolicyStageDto[]) {
    return await this.policyStagesRepository.save(updatePolicyStageDto);
  }
}
