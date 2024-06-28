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

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class SdgController {
  constructor(private readonly sdgService: SdgService) {}

  /* FIXME
   not really a V1 response, but we can't break the connection some apps have to this endpoint
  */
  @Version(['1', '2'])
  @Get()
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
