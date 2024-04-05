import { Module } from '@nestjs/common';
import { OutcomeService } from './outcome.service';
import { OutcomeController } from './outcome.controller';
import { OutcomeMapper } from './mappers/outcome.mapper';
import { OutcomeRepository } from './repositories/outcome.repository';

@Module({
  controllers: [OutcomeController],
  providers: [OutcomeService, OutcomeRepository, OutcomeMapper],
})
export class OutcomeModule {}
