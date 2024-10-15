import { Module } from '@nestjs/common';
import { LeverService } from './lever.service';
import { LeverController } from './lever.controller';
import { LeverRepository } from './repositories/lever.repository';

@Module({
  controllers: [LeverController],
  providers: [LeverService, LeverRepository],
})
export class LeverModule {}
