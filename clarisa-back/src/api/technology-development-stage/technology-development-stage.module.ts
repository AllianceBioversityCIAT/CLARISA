import { Module } from '@nestjs/common';
import { TechnologyDevelopmentStageService } from './technology-development-stage.service';
import { TechnologyDevelopmentStageController } from './technology-development-stage.controller';
import { TechnologyDevelopmentStageRepository } from './repositories/technology-development-stage.repository';

@Module({
  controllers: [TechnologyDevelopmentStageController],
  providers: [
    TechnologyDevelopmentStageService,
    TechnologyDevelopmentStageRepository,
  ],
})
export class TechnologyDevelopmentStageModule {}
