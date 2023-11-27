import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SubnationalScopeService } from './subnational-scope.service';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class SubnationalScopeController {
  constructor(private readonly studyTypeService: SubnationalScopeService) {}

  @Get()
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('country-id') country_id: number,
    @Query('country-iso2') country_iso_alpha_2: string,
  ) {
    return await this.studyTypeService.findAll(
      show,
      country_id,
      country_iso_alpha_2,
    );
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.studyTypeService.findOne(id);
  }
}
