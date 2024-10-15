import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { LeverService } from './lever.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class LeverController {
  constructor(private readonly _leverService: LeverService) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this._leverService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this._leverService.findOne(id);
  }
}
