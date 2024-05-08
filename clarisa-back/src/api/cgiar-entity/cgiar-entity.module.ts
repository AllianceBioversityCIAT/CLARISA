import { Module } from '@nestjs/common';
import { CgiarEntityService } from './cgiar-entity.service';
import { CgiarEntityController } from './cgiar-entity.controller';
import { CgiarEntityRepository } from './repositories/cgiar-entity.repository';
import { CgiarEntityTypeMapper } from '../cgiar-entity-type/mappers/cgiar-entity-type.mapper';
import { CgiarEntityMapper } from './mappers/cgiar-entity.mapper';
import { BasicDtoMapper } from '../../shared/mappers/basic-dto.mapper';
import { CenterRepository } from '../center/repositories/center.repository';
import { CenterService } from '../center/center.service';
import { CgiarEntityTypeRepository } from '../cgiar-entity-type/repositories/cgiar-entity-type.repository';
import { CenterMapper } from '../center/mappers/center.mapper';

@Module({
  controllers: [CgiarEntityController],
  providers: [
    CgiarEntityService,
    CgiarEntityRepository,
    CgiarEntityMapper,
    CgiarEntityTypeMapper,
    CgiarEntityTypeRepository,
    BasicDtoMapper,
    CenterRepository,
    CenterMapper,
    CenterService,
  ],
})
export class CgiarEntityModule {}
