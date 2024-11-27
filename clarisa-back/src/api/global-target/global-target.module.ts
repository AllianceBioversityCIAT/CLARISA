import { Module } from '@nestjs/common';
import { GlobalTargetService } from './global-target.service';
import { GlobalTargetController } from './global-target.controller';
import { GlobalTargetRepository } from './repositories/global-target.repository';
import { GlobalTargetMapper } from './mappers/global-target.mapper';

@Module({
  controllers: [GlobalTargetController],
  providers: [GlobalTargetService, GlobalTargetRepository, GlobalTargetMapper],
})
export class GlobalTargetModule {}
