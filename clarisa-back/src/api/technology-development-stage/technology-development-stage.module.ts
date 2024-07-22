import { Module } from '@nestjs/common';
import { TechnologyDevelopmentStageService } from './technology-development-stage.service';
import { TechnologyDevelopmentStageController } from './technology-development-stage.controller';
import { TechnologyDevelopmentStageRepository } from './repositories/technology-development-stage.repository';
import { TechnologyDevelopmentStageMapper } from './mappers/technology-development-stage.mapper';

@Module({
  controllers: [TechnologyDevelopmentStageController],
  providers: [
    TechnologyDevelopmentStageService,
    TechnologyDevelopmentStageRepository,
    TechnologyDevelopmentStageMapper,
  ],
})
export class TechnologyDevelopmentStageModule {}
