import { Module } from '@nestjs/common';
import { SdgService } from './sdg.service';
import { SdgController } from './sdg.controller';
import { SdgRepository } from './repositories/sdg.repository';
import { SdgMapper } from './mappers/sdg.mapper';

@Module({
  controllers: [SdgController],
  providers: [SdgService, SdgRepository, SdgMapper],
  exports: [SdgMapper],
})
export class SdgModule {}
