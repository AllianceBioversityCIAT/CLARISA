import { Injectable } from '@nestjs/common';
import { FundingSourceRepository } from './repositories/funding-source.repository';
import { FundingSourceMapper } from './mappers/funding-source.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { FundingSource } from './entities/funding-source.entity';
import { FundingSourceDto } from './dto/funding-source.dto';

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
        throw Error('?!');
    }

    return this._fundingSourceMapper.classListToDtoList(
      fundingSources,
      showIsActive,
    );
  }

  async findOne(id: number): Promise<FundingSourceDto> {
    const fundingSource: FundingSource =
      await this._fundingSourceRepository.findOneBy({
        id,
        auditableFields: { is_active: true },
      });

    return fundingSource
      ? this._fundingSourceMapper.classToDto(fundingSource, true)
      : null;
  }
}
