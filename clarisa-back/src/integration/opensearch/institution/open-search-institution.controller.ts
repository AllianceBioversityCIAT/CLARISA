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
import { OpenSearchInstitutionApi } from './open-search-institution.api';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiTags('OpenSearch')
export class OpenSearchInstitutionController {
  constructor(private readonly openSearchApi: OpenSearchInstitutionApi) {}

  @Post('reset')
  @ApiOperation({
    summary:
      'Reset the OpenSearch index, deleting all data and re-adding all institutions',
  })
  @ApiBearerAuth()
  async resetOpenSearch() {
    return this.openSearchApi.resetElasticData();
  }

  @Get('search')
  @ApiQuery({
    name: 'query',
    required: true,
    description: 'The query to search for (you can search by name or acronym)',
  })
  @ApiQuery({
    name: 'sample-size',
    required: false,
    description: 'The number of results to return (by default 20)',
    type: Number,
  })
  @ApiOperation({
    summary:
      'Search for institutions on the OpenSearch index. The returned data has the same schema as the /institutions endpoint, but with an additional property called "score". A higher score means a better match with the query.',
  })
  @ApiBearerAuth()
  async search(
    @Query('query') query: string,
    @Query('sample-size', new DefaultValuePipe(20), ParseIntPipe) size: number,
  ) {
    return this.openSearchApi.search(
      query,
      ['name', 'acronym'],
      [{ code: { order: 'asc' } }],
      size,
    );
  }
}
