import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import { Query, UseInterceptors } from '@nestjs/common/decorators';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ParseIntPipe } from '@nestjs/common/pipes';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller()
@ApiExcludeController()
@UseInterceptors(ClassSerializerInterceptor)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.permissionService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.permissionService.findOne(id);
  }
}
