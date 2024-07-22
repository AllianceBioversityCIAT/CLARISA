import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { SourceService } from './source.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SourceDto } from './dto/source.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Sources')
export class SourceController {
  constructor(private readonly sourcesService: SourceService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all sources. Defaults to active.',
  })
  @ApiOkResponse({ type: [SourceDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.sourcesService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the beneficiary',
  })
  @ApiOkResponse({ type: [SourceDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.sourcesService.findOne(id);
  }
}
