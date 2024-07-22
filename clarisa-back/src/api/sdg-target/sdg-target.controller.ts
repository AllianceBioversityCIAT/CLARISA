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
import { SdgTargetService } from './sdg-target.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SdgTargetV1Dto } from './dto/sdg-target.v1.dto';
import { SdgTargetV2Dto } from './dto/sdg-target.v2.dto';
import { SdgTargetIpsrDto } from './dto/sdg-target-ipsr.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('SDG Targets')
export class SdgTargetController {
  constructor(private readonly sdgTargetService: SdgTargetService) {}

  @Version('1')
  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all SDG Targets. Defaults to active.',
  })
  @ApiOkResponse({ type: [SdgTargetV1Dto] })
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.sdgTargetService.findAllV1(show);
  }

  @Version('2')
  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all SDG Targets. Defaults to active.',
  })
  @ApiOkResponse({ type: [SdgTargetV2Dto] })
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.sdgTargetService.findAllV2(show);
  }

  @Get('sdg-ipsr')
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all SDG Targets. Defaults to active.',
  })
  @ApiOkResponse({ type: [SdgTargetIpsrDto] })
  async findAllIpsr(@Query('show') show: FindAllOptions) {
    return await this.sdgTargetService.findAllForIpsr(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the SDG Target',
  })
  @ApiOkResponse({ type: [SdgTargetV2Dto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.sdgTargetService.findOneV2(id);
  }
}
