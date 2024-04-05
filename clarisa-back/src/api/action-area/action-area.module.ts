import { Module } from '@nestjs/common';
import { ActionAreaService } from './action-area.service';
import { ActionAreaController } from './action-area.controller';
import { ActionAreaRepository } from './repositories/action-area.repository';
import { ActionAreaMapper } from './mappers/action-area.mapper';

@Module({
  controllers: [ActionAreaController],
  providers: [ActionAreaService, ActionAreaRepository, ActionAreaMapper],
})
export class ActionAreaModule {}
