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

@Controller()
export class OpenSearchInstitutionController {
  constructor(private readonly openSearchApi: OpenSearchInstitutionApi) {}

  @Post('reset')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async resetOpenSearch() {
    return this.openSearchApi.resetElasticData();
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async search(
    @Query('query') query: string,
    @Query('sample-size', new DefaultValuePipe(20), ParseIntPipe) size: number,
  ) {
    return this.openSearchApi.search(query, size);
  }
}
