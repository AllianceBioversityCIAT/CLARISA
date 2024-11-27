import { Module } from '@nestjs/common';
import { DepthDescriptionService } from './depth-description.service';
import { DepthDescriptionController } from './depth-description.controller';
import { DepthDescriptionRepository } from './repositories/depth-description.repository';
import { DepthDescriptionMapper } from './mappers/depth-description.mapper';

@Module({
  controllers: [DepthDescriptionController],
  providers: [
    DepthDescriptionService,
    DepthDescriptionRepository,
    DepthDescriptionMapper,
  ],
})
export class DepthDescriptionModule {}
