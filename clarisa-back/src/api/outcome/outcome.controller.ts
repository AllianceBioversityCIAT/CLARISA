import {
  Controller,
  Get,
  Param,
  Version,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { OutcomeService } from './outcome.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
export class OutcomeController {
  constructor(private readonly outcomeService: OutcomeService) {}

  @Version('1')
  @Get()
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.outcomeService.findAll(show);
  }

  @Version('1')
  @Get('get/:id')
  async findOneV1(@Param('id', ParseIntPipe) id: number) {
    return await this.outcomeService.findOne(id);
  }
}
