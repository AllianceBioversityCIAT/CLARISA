import { Injectable } from '@nestjs/common';
import { FundingSourceRepository } from './repositories/funding-source.repository';
import { FundingSourceMapper } from './mappers/funding-source.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { FundingSource } from './entities/funding-source.entity';
import { FundingSourceDto } from './dto/funding-source.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class FundingSourceService {
  constructor(
    private _fundingSourceRepository: FundingSourceRepository,
    private _fundingSourceMapper: FundingSourceMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<FundingSourceDto[]> {
    let fundingSources: FundingSource[] = [];
    let showIsActive: boolean = true;

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        fundingSources = await this._fundingSourceRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        showIsActive = option !== FindAllOptions.SHOW_ONLY_ACTIVE;
        fundingSources = await this._fundingSourceRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw new BadParamsError(
          this._fundingSourceRepository.target.toString(),
          'option',
          option,
        );
    }

    return this._fundingSourceMapper.classListToDtoList(
      fundingSources,
      showIsActive,
    );
  }

  async findOne(id: number): Promise<FundingSourceDto> {
    return this._fundingSourceRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._fundingSourceRepository.target.toString(),
          id,
        );
      })
      .then((fundingSource) =>
        this._fundingSourceMapper.classToDto(fundingSource, true),
      );
  }
}
