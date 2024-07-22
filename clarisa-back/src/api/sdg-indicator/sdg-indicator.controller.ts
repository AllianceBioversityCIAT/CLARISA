import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
  ParseIntPipe,
  Version,
} from '@nestjs/common';
import { SdgIndicatorService } from './sdg-indicator.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SdgIndicatorV2Dto } from './dto/sdg-indicator.v2.dto';
import { SdgIndicatorV1Dto } from './dto/sdg-indicator.v1.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('SDG Indicators')
export class SdgIndicatorController {
  constructor(private readonly sdgIndicatorService: SdgIndicatorService) {}

  @Version('1')
  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all SDG Indicators. Defaults to active.',
  })
  @ApiOkResponse({ type: [SdgIndicatorV1Dto] })
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.sdgIndicatorService.findAllV1(show);
  }

  @Version('2')
  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all SDG Indicators. Defaults to active.',
  })
  @ApiOkResponse({ type: [SdgIndicatorV2Dto] })
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.sdgIndicatorService.findAllV2(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the SDG Indicator',
  })
  @ApiOkResponse({ type: [SdgIndicatorV2Dto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.sdgIndicatorService.findOneV2(id);
  }
}
