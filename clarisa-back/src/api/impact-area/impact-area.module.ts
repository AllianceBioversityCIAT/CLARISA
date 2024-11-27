import { Module } from '@nestjs/common';
import { ImpactAreaService } from './impact-area.service';
import { ImpactAreaController } from './impact-area.controller';
import { ImpactAreaRepository } from './repositories/impact-area.repository';
import { ImpactAreaMapper } from './mappers/impact-area.mapper';

@Module({
  controllers: [ImpactAreaController],
  providers: [ImpactAreaService, ImpactAreaRepository, ImpactAreaMapper],
})
export class ImpactAreaModule {}
