import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { SubnationalScopeService } from './subnational-scope.service';
import { SubnationalScopeDto } from './dto/subnational-scope.dto';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SubnationalFindAllParamsDto } from './dto/subantional-find-all-params.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Subnational Scopes')
export class SubnationalScopeController {
  constructor(
    private readonly subnationalScopeService: SubnationalScopeService,
  ) {}

  @Get()
  @ApiQuery({
    type: SubnationalFindAllParamsDto,
  })
  @ApiOkResponse({ type: [SubnationalScopeDto] })
  @ApiOperation({
    summary:
      'Get all subnational scopes, optionally filtered by status, country ISO numeric, country ISO alpha-2 code, offset and limit. These last two parameters, despite being required in Swagger (due to performance reasons), are optional otherwise.',
  })
  async findAll(
    @Query('show') show,
    @Query('country-id') country_id,
    @Query('country-iso2') country_iso_alpha_2,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?,
  ) {
    return await this.subnationalScopeService.findAll(
      show,
      country_id,
      country_iso_alpha_2,
      offset,
      limit,
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
  @ApiOperation({
    summary: 'Get a subnational scope by id',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.subnationalScopeService.findOne(id);
  }
}
