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

@Controller()
export class OpenSearchCountryController {
  constructor(private readonly openSearchApi: OpenSearchCountryApi) {}

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
