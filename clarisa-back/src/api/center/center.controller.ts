import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CenterService } from './center.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class CenterController {
  constructor(private readonly centerService: CenterService) {}

  @Get()
  findAll(@Query('show') show: FindAllOptions) {
    return this.centerService.findAllV1(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.centerService.findOneV1(id);
  }
}
