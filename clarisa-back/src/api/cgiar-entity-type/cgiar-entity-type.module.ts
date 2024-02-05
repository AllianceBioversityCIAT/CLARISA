import { Module } from '@nestjs/common';
import { CgiarEntityTypeService } from './cgiar-entity-type.service';
import { CgiarEntityTypeController } from './cgiar-entity-type.controller';
import { CgiarEntityTypeRepository } from './repositories/cgiar-entity-type.repository';
import { CgiarEntityTypeMapper } from './mappers/cgiar-entity-type.mapper';

@Module({
  controllers: [CgiarEntityTypeController],
  providers: [
    CgiarEntityTypeService,
    CgiarEntityTypeRepository,
    CgiarEntityTypeMapper,
  ],
})
export class CgiarEntityTypeModule {}
