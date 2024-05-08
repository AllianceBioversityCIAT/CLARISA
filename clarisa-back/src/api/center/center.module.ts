import { Module } from '@nestjs/common';
import { CenterService } from './center.service';
import { CenterController } from './center.controller';
import { CenterRepository } from './repositories/center.repository';
import { CenterMapper } from './mappers/center.mapper';
import { BasicDtoMapper } from '../../shared/mappers/basic-dto.mapper';
import { CgiarEntityTypeMapper } from '../cgiar-entity-type/mappers/cgiar-entity-type.mapper';
import { CgiarEntityTypeRepository } from '../cgiar-entity-type/repositories/cgiar-entity-type.repository';

@Module({
  controllers: [CenterController],
  providers: [
    CenterService,
    CenterRepository,
    CenterMapper,
    BasicDtoMapper,
    CgiarEntityTypeMapper,
    CgiarEntityTypeRepository,
  ],
})
export class CenterModule {}
