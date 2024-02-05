import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { CgiarEntityTypeService } from './cgiar-entity-type.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class CgiarEntityTypeController {
  constructor(
    private readonly cgiarEntityTypeService: CgiarEntityTypeService,
  ) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.cgiarEntityTypeService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.cgiarEntityTypeService.findOne(id);
  }
}
