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
import { SdgService } from './sdg.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SdgV2Dto } from './dto/sdg.v2.dto';
import { SdgV1Dto } from './dto/sdg.v1.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Sustainable Development Goals')
export class SdgController {
  constructor(private readonly sdgService: SdgService) {}

  /* FIXME
   not really a V1 response, but we can't break the connection some apps have to this endpoint
  */
  @Version(['1', '2'])
  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all SDGs. Defaults to active.',
  })
  @ApiOkResponse({ type: [SdgV2Dto] })
  @ApiOperation({
    summary: 'Get all SDGs, optionally filtered by status',
  })
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.sdgService.findAllV2(show);
  }

  @Get('legacy')
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all SDGs. Defaults to active.',
  })
  @ApiOkResponse({ type: [SdgV1Dto] })
  @ApiOperation({
    summary: 'Get all SDGs (legacy), optionally filtered by status',
  })
  async findAllLegacy(@Query('show') show: FindAllOptions) {
    return await this.sdgService.findAllV1(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the SDG',
  })
  @ApiOkResponse({ type: [SdgV2Dto] })
  @ApiOperation({
    summary: 'Get an SDG by id',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.sdgService.findOneV2(id);
  }
}
