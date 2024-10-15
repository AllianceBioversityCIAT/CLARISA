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
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Lever } from './entities/lever.entity';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Levers/Research Areas')
export class LeverController {
  constructor(private readonly _leverService: LeverService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all alliance levers. Defaults to active.',
  })
  @ApiOkResponse({ type: [Lever] })
  @ApiOperation({
    summary: 'Get all alliance levers, optionally filtered by status',
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this._leverService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the alliance lever',
  })
  @ApiOkResponse({ type: [Lever] })
  @ApiOperation({
    summary: 'Get an alliance lever by id',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this._leverService.findOne(id);
  }
}
