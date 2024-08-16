import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { OpenSearchApi } from './open-search.api';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OpenSearchController {
  constructor(private readonly openSearchApi: OpenSearchApi) {}

  @Post('reset')
  async resetOpenSearch() {
    return this.openSearchApi.resetElasticData();
  }
}
