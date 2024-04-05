import { Module } from '@nestjs/common';
import { ActionAreaOutcomeService } from './action-area-outcome.service';
import { ActionAreaOutcomeController } from './action-area-outcome.controller';
import { ActionAreaOutcomeRepository } from './repositories/action-area-outcome.repository';
import { ActionAreaOutcomeMapper } from './mappers/action-area-outcome.mapper';
import { ActionAreaMapper } from '../action-area/mappers/action-area.mapper';
import { OutcomeMapper } from '../outcome/mappers/outcome.mapper';
import { ActionAreaOutcomeIndicatorRepository } from '../action-area-outcome-indicator/repositories/action-area-outcome-indicator.repository';

@Module({
  controllers: [ActionAreaOutcomeController],
  providers: [
    ActionAreaOutcomeService,
    ActionAreaOutcomeRepository,
    ActionAreaOutcomeIndicatorRepository,
    ActionAreaOutcomeMapper,
    ActionAreaMapper,
    OutcomeMapper,
  ],
})
export class ActionAreaOutcomeModule {}
