import {
  Controller,
  Get,
  Param,
  Version,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { IndicatorService } from './indicator.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
export class IndicatorController {
  constructor(private readonly indicatorService: IndicatorService) {}

  @Version('1')
  @Get()
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.indicatorService.findAll(show);
  }

  @Version('1')
  @Get('get/:id')
  async findOneV1(@Param('id', ParseIntPipe) id: number) {
    return await this.indicatorService.findOne(id);
  }
}
