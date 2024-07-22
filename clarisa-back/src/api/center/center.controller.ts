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
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CenterDtoV1 } from './dto/center.v1.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Centers')
export class CenterController {
  constructor(private readonly centerService: CenterService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all centers. Defaults to active.',
  })
  @ApiOkResponse({ type: [CenterDtoV1] })
  findAll(@Query('show') show: FindAllOptions) {
    return this.centerService.findAllV1(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the center',
  })
  @ApiOkResponse({ type: [CenterDtoV1] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.centerService.findOneV1(id);
  }
}
