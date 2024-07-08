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

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class FundingSourceController {
  constructor(private readonly fundingSourceService: FundingSourceService) {}

  @Get()
  findAll(@Query('show') show: FindAllOptions) {
    return this.fundingSourceService.findAll(show);
  }

  @Get('get/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fundingSourceService.findOne(id);
  }
}
