import { Injectable } from '@nestjs/common';
import { FundingSource } from '../entities/funding-source.entity';
import { FundingSourceDto } from '../dto/funding-source.dto';

@Injectable()
export class FundingSourceMapper {
  public classToDto(
    fundingSource: FundingSource,
    showIsActive: boolean = false,
  ): FundingSourceDto {
    const fundingSourceDto: FundingSourceDto = new FundingSourceDto();

    fundingSourceDto.code = fundingSource.id;
    fundingSourceDto.name = fundingSource.name;
    fundingSourceDto.description = fundingSource.description;
    fundingSourceDto.type_term = fundingSource.type_term;
    fundingSourceDto.funding_to = fundingSource.funding_to;
    if (showIsActive) {
      fundingSourceDto.is_active = fundingSource.auditableFields?.is_active;
    }

    return fundingSourceDto;
  }

  public classListToDtoList(
    fundingSources: FundingSource[],
    showIsActive: boolean = false,
  ): FundingSourceDto[] {
    return fundingSources.map((fundingSource) =>
      this.classToDto(fundingSource, showIsActive),
    );
  }
}
