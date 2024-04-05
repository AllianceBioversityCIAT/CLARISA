import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Version,
} from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ActionAreaOutcomeService } from './action-area-outcome.service';

@Controller()
export class ActionAreaOutcomeController {
  constructor(
    private readonly actionAreaOutcomeService: ActionAreaOutcomeService,
  ) {}

  @Version('1')
  @Get()
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.actionAreaOutcomeService.findAllV1(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.actionAreaOutcomeService.findOne(id);
  }

  @Version('2')
  @Get()
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.actionAreaOutcomeService.findAllV2(show);
  }
}
