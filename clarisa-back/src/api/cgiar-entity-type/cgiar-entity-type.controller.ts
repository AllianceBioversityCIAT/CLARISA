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
import { CgiarEntityTypeService } from './cgiar-entity-type.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class CgiarEntityTypeController {
  constructor(
    private readonly cgiarEntityTypeService: CgiarEntityTypeService,
  ) {}

  @Version('1')
  @Get()
  async findAllV1(@Query('show') show: FindAllOptions) {
    return await this.cgiarEntityTypeService.findAllV1(show);
  }

  @Version('1')
  @Get('get/:id')
  async findOneV1(@Param('id', ParseIntPipe) id: number) {
    return await this.cgiarEntityTypeService.findOneV1(id);
  }

  @Version('2')
  @Get()
  async findAllV2(@Query('show') show: FindAllOptions) {
    return await this.cgiarEntityTypeService.findAllV2(show);
  }

  @Version('2')
  @Get('get/:id')
  async findOneV2(@Param('id', ParseIntPipe) id: number) {
    return await this.cgiarEntityTypeService.findOneV2(id);
  }
}
