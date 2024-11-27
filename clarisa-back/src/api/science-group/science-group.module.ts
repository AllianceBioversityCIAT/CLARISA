import { Module } from '@nestjs/common';
import { ScienceGroupService } from './science-group.service';
import { ScienceGroupController } from './science-group.controller';
import { ScienceGroupRepository } from './repositories/science-group.repository';
import { ScienceGroupMapper } from './mappers/science-group.mapper';

@Module({
  controllers: [ScienceGroupController],
  providers: [ScienceGroupService, ScienceGroupRepository, ScienceGroupMapper],
})
export class ScienceGroupModule {}
