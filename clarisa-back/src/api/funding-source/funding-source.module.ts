import { Module } from '@nestjs/common';
import { FundingSourceService } from './funding-source.service';
import { FundingSourceController } from './funding-source.controller';
import { FundingSourceRepository } from './repositories/funding-source.repository';
import { FundingSourceMapper } from './mappers/funding-source.mapper';

@Module({
  controllers: [FundingSourceController],
  providers: [
    FundingSourceService,
    FundingSourceMapper,
    FundingSourceRepository,
  ],
})
export class FundingSourceModule {}
