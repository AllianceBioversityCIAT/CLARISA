import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Version,
} from '@nestjs/common';
import { ActionAreaOutcomeIndicatorService } from './action-area-outcome-indicator.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
export class ActionAreaOutcomeIndicatorController {
  constructor(
    private readonly actionAreaOutcomeIndicatorService: ActionAreaOutcomeIndicatorService,
  ) {}

  @Version('1')
  @Get()
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.actionAreaOutcomeIndicatorService.findAllV1(show);
  }

  @Version('1')
  @Get('get/:id')
  async findOneV1(@Param('id', ParseIntPipe) id: number) {
    return await this.actionAreaOutcomeIndicatorService.findOneV1(id);
  }

  @Version('2')
  @Get()
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.actionAreaOutcomeIndicatorService.findAllV2(show);
  }

  @Version('2')
  @Get('get/:id')
  async findOneV2(@Param('id', ParseIntPipe) id: number) {
    return await this.actionAreaOutcomeIndicatorService.findOneV2(id);
  }
}
