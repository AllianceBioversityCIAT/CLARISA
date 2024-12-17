import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../shared/guards/permission.guard';
import { OpenSearchCountryApi } from './open-search-country.api';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
@ApiTags('OpenSearch')
export class OpenSearchCountryController {
  constructor(private readonly openSearchApi: OpenSearchCountryApi) {}

  @Post('reset')
  @ApiOperation({
    summary:
      'Reset the OpenSearch index, deleting all data and re-adding all countries',
  })
  async resetOpenSearch() {
    return this.openSearchApi.resetElasticData();
  }

  @Get('search')
  @ApiQuery({
    name: 'query',
    required: true,
    description:
      'The query to search for (you can search by name or iso alpha 2)',
  })
  @ApiQuery({
    name: 'sample-size',
    required: false,
    description: 'The number of results to return (by default 20)',
    type: Number,
  })
  @ApiOperation({
    summary:
      'Search for countries on the OpenSearch index. The returned data includes a list of countries, each containing its sub-nationals. The response also includes a "score" property for each country and sub-national, where a higher score indicates a better match with the query.',
  })
  async search(
    @Query('query') query: string,
    @Query('sample-size', new DefaultValuePipe(20), ParseIntPipe) size: number,
  ) {
    return this.openSearchApi.search(
      query,
      ['name', 'iso_alpha_2'],
      [
        {
          id: { order: 'asc' },
        },
      ],
      size,
    );
  }
}
