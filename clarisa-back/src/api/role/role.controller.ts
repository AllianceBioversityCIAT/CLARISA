import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { RoleService } from './role.service';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  findAll(@Query('show') show: FindAllOptions) {
    return this.roleService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findOne(id);
  }
}
