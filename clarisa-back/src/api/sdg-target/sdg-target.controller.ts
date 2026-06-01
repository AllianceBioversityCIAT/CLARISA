import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Version,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SdgTargetService } from './sdg-target.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('SDG Target')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class SdgTargetController {
  constructor(private readonly sdgTargetService: SdgTargetService) {}

  @Version('1')
  @Get()
  @ApiOperation({
    summary: 'List SDG targets',
    description: 'Targets associated with the UN Sustainable Development Goals.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.sdgTargetService.findAllV1(show);
  }

  @Version('2')
  @Get()
  @ApiOperation({
    summary: 'List SDG targets',
    description: 'Targets associated with the UN Sustainable Development Goals.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.sdgTargetService.findAllV2(show);
  }

  @Get('sdg-ipsr')
  async findAllIpsr(@Query('show') show: FindAllOptions) {
    return await this.sdgTargetService.findAllIpsr(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.sdgTargetService.findOne(id);
  }
}
