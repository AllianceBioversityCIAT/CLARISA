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

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class SdgIndicatorController {
  constructor(private readonly sdgIndicatorService: SdgIndicatorService) {}

  @Version('1')
  @Get()
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.sdgIndicatorService.findAllV1(show);
  }

  @Version('2')
  @Get()
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.sdgIndicatorService.findAllV2(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.sdgIndicatorService.findOne(id);
  }
}
