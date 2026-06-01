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
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SdgIndicatorService } from './sdg-indicator.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('SDG Indicator')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class SdgIndicatorController {
  constructor(private readonly sdgIndicatorService: SdgIndicatorService) {}

  @Version('1')
  @Get()
  @ApiOperation({
    summary: 'List SDG indicators',
    description: 'Indicators associated with the UN Sustainable Development Goals.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.sdgIndicatorService.findAllV1(show);
  }

  @Version('2')
  @Get()
  @ApiOperation({
    summary: 'List SDG indicators',
    description: 'Indicators associated with the UN Sustainable Development Goals.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.sdgIndicatorService.findAllV2(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.sdgIndicatorService.findOne(id);
  }
}
