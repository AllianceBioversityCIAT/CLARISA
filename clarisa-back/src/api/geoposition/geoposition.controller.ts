import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { GeopositionService } from './geoposition.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class GeopositionController {
  constructor(private readonly geopositionService: GeopositionService) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.geopositionService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.geopositionService.findOne(id);
  }
}
