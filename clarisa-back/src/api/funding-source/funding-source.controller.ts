import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { FundingSourceService } from './funding-source.service';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FundingSourceDto } from './dto/funding-source.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Funding Sources')
export class FundingSourceController {
  constructor(private readonly fundingSourceService: FundingSourceService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all funding sources. Defaults to active.',
  })
  @ApiOkResponse({ type: [FundingSourceDto] })
  findAll(@Query('show') show: FindAllOptions) {
    return this.fundingSourceService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the funding source',
  })
  @ApiOkResponse({ type: [FundingSourceDto] })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fundingSourceService.findOne(id);
  }
}
