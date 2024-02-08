import { Module } from '@nestjs/common';
import { FrameworkService } from './framework.service';
import { FrameworkController } from './framework.controller';
import { FrameworkRepository } from './repositories/framework.repository';
import { FrameworkMapper } from './mappers/framework.mapper';

@Module({
  controllers: [FrameworkController],
  providers: [FrameworkService, FrameworkRepository, FrameworkMapper],
})
export class FrameworkModule {}
