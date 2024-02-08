import { Module } from '@nestjs/common';
import { CgiarEntityService } from './cgiar-entity.service';
import { CgiarEntityController } from './cgiar-entity.controller';
import { CgiarEntityRepository } from './repositories/cgiar-entity.repository';
import { CgiarEntityMapper } from './mappers/cgiar-entity.mapper';
import { CgiarEntityTypeMapper } from '../cgiar-entity-type/mappers/cgiar-entity-type.mapper';
import { FrameworkMapper } from '../framework/mappers/framework.mapper';

@Module({
  controllers: [CgiarEntityController],
  providers: [
    CgiarEntityService,
    CgiarEntityRepository,
    CgiarEntityMapper,
    CgiarEntityTypeMapper,
    FrameworkMapper,
  ],
})
export class CgiarEntityModule {}
