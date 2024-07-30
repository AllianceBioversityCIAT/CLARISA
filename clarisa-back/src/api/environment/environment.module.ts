import { Module } from '@nestjs/common';
import { EnvironmentService } from './environment.service';
import { EnvironmentController } from './environment.controller';
import { EnvironmentRepository } from './repositories/environment.repository';
import { EnvironmentMapper } from './mappers/environment.mapper';
import { BasicDtoMapper } from '../../shared/mappers/basic-dto.mapper';

@Module({
  controllers: [EnvironmentController],
  providers: [
    EnvironmentService,
    EnvironmentRepository,
    EnvironmentMapper,
    BasicDtoMapper,
  ],
  exports: [EnvironmentService, EnvironmentRepository],
})
export class EnvironmentModule {}
