import { Module } from '@nestjs/common';
import { EndOfInitiativeOutcomeService } from './end-of-initiative-outcome.service';
import { HttpModule } from '@nestjs/axios';
import { EndOfInitiativeOutcomeController } from './end-of-initiative-outcome.controller';
import { EndOfInitiativeOutcomeRepository } from './repositories/end-of-initiative-outcomes.repository';
import { OSTApi } from '../../integration/ost/ost.api';
import { IntegrationModule } from '../../integration/integration.module';

@Module({
  imports: [HttpModule, IntegrationModule],
  controllers: [EndOfInitiativeOutcomeController],
  providers: [
    EndOfInitiativeOutcomeService,
    OSTApi,
    EndOfInitiativeOutcomeRepository,
  ],
})
export class EndOfInitiativeOutcomeModule {}
