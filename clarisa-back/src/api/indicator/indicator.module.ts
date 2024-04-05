import { Module } from '@nestjs/common';
import { IndicatorService } from './indicator.service';
import { IndicatorController } from './indicator.controller';
import { IndicatorMapper } from './mappers/indicator.mapper';
import { IndicatorRepository } from './repositories/indicator.repository';

@Module({
  controllers: [IndicatorController],
  providers: [IndicatorService, IndicatorRepository, IndicatorMapper],
})
export class IndicatorModule {}
