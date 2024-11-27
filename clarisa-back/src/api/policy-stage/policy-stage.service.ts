import { Injectable } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SourceOption } from '../../shared/entities/enums/source-options';
import { UpdatePolicyStageDto } from './dto/update-policy-stage.dto';
import { PolicyStage } from './entities/policy-stage.entity';
import { PolicyStageRepository } from './repositories/policy-stage.repository';
import { PolicyStageDto } from './dto/policy-stage.dto';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
import { BadParamsError } from '../../shared/errors/bad-params.error';

@Injectable()
export class PolicyStageService {
  constructor(private _policyStagesRepository: PolicyStageRepository) {}

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
        throw new BadParamsError(
          this._policyStagesRepository.target.toString(),
          'type',
          type,
        );
    }

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._policyStagesRepository.find({
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
        return await this._policyStagesRepository.find({
          where: whereClause,
        });
      default:
        throw new BadParamsError(
          this._policyStagesRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<PolicyStageDto> {
    return await this._policyStagesRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._policyStagesRepository.target.toString(),
          id,
        );
      });
  }

  async update(updatePolicyStageDto: UpdatePolicyStageDto[]) {
    return await this._policyStagesRepository.save(updatePolicyStageDto);
  }
}
