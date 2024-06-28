import { Module } from '@nestjs/common';
import { SdgIndicatorService } from './sdg-indicator.service';
import { SdgIndicatorController } from './sdg-indicator.controller';
import { SdgIndicatorRepository } from './repositories/sdg-indicator.repository';
import { SdgTargetModule } from '../sdg-target/sdg-target.module';
import { SdgIndicatorMapper } from './mappers/sdg-indicator.mapper';

@Module({
  imports: [SdgTargetModule],
  controllers: [SdgIndicatorController],
  providers: [SdgIndicatorService, SdgIndicatorRepository, SdgIndicatorMapper],
})
export class SdgIndicatorModule {}
