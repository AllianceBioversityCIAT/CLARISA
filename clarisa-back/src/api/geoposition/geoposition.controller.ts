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
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GeopositionDto } from './dto/geoposition.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Geopositions')
export class GeopositionController {
  constructor(private readonly geopositionService: GeopositionService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all geopositions. Defaults to active.',
  })
  @ApiOkResponse({ type: [GeopositionDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.geopositionService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the geoposition',
  })
  @ApiOkResponse({ type: [GeopositionDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.geopositionService.findOne(id);
  }
}
