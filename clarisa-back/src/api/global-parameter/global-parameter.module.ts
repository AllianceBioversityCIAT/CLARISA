import { Module } from '@nestjs/common';
import { GlobalParameterService } from './global-parameter.service';
import { GlobalParameterController } from './global-parameter.controller';
import { GlobalParameterRepository } from './repositories/global-parameter.repository';

@Module({
  controllers: [GlobalParameterController],
  providers: [GlobalParameterService, GlobalParameterRepository],
  exports: [GlobalParameterService, GlobalParameterRepository],
})
export class GlobalParameterModule {}
