import { Module } from '@nestjs/common';
import { ActionAreaOutcomeIndicatorController } from './action-area-outcome-indicator.controller';
import { ActionAreaOutcomeIndicatorService } from './action-area-outcome-indicator.service';
import { ActionAreaOutcomeIndicatorRepository } from './repositories/action-area-outcome-indicator.repository';
import { ActionAreaOutcomeMapper } from '../action-area-outcome/mappers/action-area-outcome.mapper';
import { IndicatorMapper } from '../indicator/mappers/indicator.mapper';
import { ActionAreaOutcomeIndicatorMapper } from './mappers/action-area-outcome-indicator.mapper';
import { OutcomeMapper } from '../outcome/mappers/outcome.mapper';
import { ActionAreaMapper } from '../action-area/mappers/action-area.mapper';

@Module({
  controllers: [ActionAreaOutcomeIndicatorController],
  providers: [
    ActionAreaOutcomeIndicatorService,
    ActionAreaOutcomeIndicatorRepository,
    ActionAreaOutcomeIndicatorMapper,
    IndicatorMapper,
    ActionAreaOutcomeMapper,
    OutcomeMapper,
    ActionAreaMapper,
  ],
})
export class ActionAreaOutcomeIndicatorModule {}
