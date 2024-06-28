import { Module } from '@nestjs/common';
import { SdgTargetService } from './sdg-target.service';
import { SdgTargetController } from './sdg-target.controller';
import { SdgTargetRepository } from './repositories/sdg-target.repository';
import { SdgModule } from '../sdg/sdg.module';
import { SdgTargetMapper } from './mappers/sdg-target.mapper';

@Module({
  imports: [SdgModule],
  controllers: [SdgTargetController],
  providers: [SdgTargetService, SdgTargetRepository, SdgTargetMapper],
  exports: [SdgTargetMapper],
})
export class SdgTargetModule {}
