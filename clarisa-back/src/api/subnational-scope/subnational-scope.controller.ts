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
import { SubnationalScopeDto } from './dto/subnational-scope.dto';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Subnational Scopes')
export class SubnationalScopeController {
  constructor(private readonly studyTypeService: SubnationalScopeService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all subnational scopes. Defaults to active.',
  })
  @ApiQuery({
    name: 'country-id',
    type: Number,
    required: false,
    description: 'Show subnational scopes for a specific country by its id.',
  })
  @ApiQuery({
    name: 'country-iso2',
    type: Number,
    required: false,
    description:
      'Show subnational scopes for a specific country by its ISO alpha-2 code.',
  })
  @ApiOkResponse({ type: [SubnationalScopeDto] })
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
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the subnational scope',
  })
  @ApiOkResponse({ type: [SubnationalScopeDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.studyTypeService.findOne(id);
  }
}
