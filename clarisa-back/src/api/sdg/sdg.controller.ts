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
import { SdgService } from './sdg.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('SDG')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class SdgController {
  constructor(private readonly sdgService: SdgService) {}

  /* FIXME
   not really a V1 response, but we can't break the connection some apps have to this endpoint
  */
  @Version(['1', '2'])
  @Get()
  @ApiOperation({
    summary: 'List Sustainable Development Goals',
    description:
      'The 17 UN Sustainable Development Goals (SDGs) used as a reference framework across CGIAR reporting.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.sdgService.findAllV2(show);
  }

  @Get('legacy')
  async findAllLegacy(@Query('show') show: FindAllOptions) {
    return await this.sdgService.findAllV1(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.sdgService.findOne(id);
  }
}
