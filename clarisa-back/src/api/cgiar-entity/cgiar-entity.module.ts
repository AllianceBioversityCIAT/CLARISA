import { Module } from '@nestjs/common';
import { CgiarEntityService } from './cgiar-entity.service';
import { CgiarEntityController } from './cgiar-entity.controller';
import { CgiarEntityRepository } from './repositories/cgiar-entity.repository';
import { CgiarEntityTypeMapper } from '../cgiar-entity-type/mappers/cgiar-entity-type.mapper';
import { CgiarEntityMapper } from './mappers/cgiar-entity.mapper';
import { BasicDtoMapper } from '../../shared/mappers/basic-dto.mapper';

@Module({
  controllers: [CgiarEntityController],
  providers: [
    CgiarEntityService,
    CgiarEntityRepository,
    CgiarEntityMapper,
    CgiarEntityTypeMapper,
    BasicDtoMapper,
  ],
})
export class CgiarEntityModule {}
