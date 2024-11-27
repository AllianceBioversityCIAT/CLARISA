import { Module } from '@nestjs/common';
import { InnovationTypeService } from './innovation-type.service';
import { InnovationTypeController } from './innovation-type.controller';
import { InnovationTypeRepository } from './repositories/innovation-type.repository';
import { InnovationTypeMapper } from './mappers/innovation-type.mapper';

@Module({
  controllers: [InnovationTypeController],
  providers: [
    InnovationTypeService,
    InnovationTypeRepository,
    InnovationTypeMapper,
  ],
})
export class InnovationTypeModule {}
