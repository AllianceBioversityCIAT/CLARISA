import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OpenSearchSubnationalApi } from './open-search-subnational.api';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../shared/guards/permission.guard';

@Controller()
export class OpenSearchSubnationalController {
  constructor(private readonly openSearchApi: OpenSearchSubnationalApi) {}

  @Post('reset')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async resetOpenSearch() {
    return this.openSearchApi.resetElasticData();
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async search(
    @Query('query') query: string,
    @Query('country') isoAlpha2: string,
    @Query('sample-size', new DefaultValuePipe(20), ParseIntPipe) size: number,
  ) {
    return this.openSearchApi.search(
      query,
      ['name', 'code'],
      [
        {
          id: { order: 'asc' },
        },
      ],
      size,
      isoAlpha2,
      'iso_alpha_2',
    );
  }
}
