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
import { Immutable } from '../../../shared/utils/deep-immutable';
import { InstitutionElasticDto } from './dto/institution-elastic.dto';

@Controller()
export class OpenSearchInstitutionController {
  constructor(
    private readonly openSearchApi: Immutable<OpenSearchInstitutionApi>,
  ) {}

  @Post('reset')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async resetOpenSearch(): Promise<string> {
    return this.openSearchApi.resetElasticData();
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async search(
    @Query('query') query: string,
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    @Query('sample-size', new DefaultValuePipe(20), ParseIntPipe) size: number,
  ): Promise<InstitutionElasticDto[] | undefined> {
    return this.openSearchApi.search(query, size);
  }
}
