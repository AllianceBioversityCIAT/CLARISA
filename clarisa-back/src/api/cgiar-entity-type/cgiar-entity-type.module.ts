import { Module } from '@nestjs/common';
import { CgiarEntityTypeService } from './cgiar-entity-type.service';
import { CgiarEntityTypeController } from './cgiar-entity-type.controller';
import { CgiarEntityTypeRepository } from './repositories/cgiar-entity-type.repository';
import { CgiarEntityTypeMapper } from './mappers/cgiar-entity-type.mapper';
import { BasicDtoMapper } from '../../shared/mappers/basic-dto.mapper';

@Module({
  controllers: [CgiarEntityTypeController],
  providers: [
    CgiarEntityTypeService,
    CgiarEntityTypeRepository,
    CgiarEntityTypeMapper,
    BasicDtoMapper,
  ],
})
export class CgiarEntityTypeModule {}
