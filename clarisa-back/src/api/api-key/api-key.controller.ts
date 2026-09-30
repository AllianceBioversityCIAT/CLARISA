import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyUsageMetricsService } from './api-key-usage-metrics.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import {
  ApiKeyUsageQueryDto,
  UsageEndpointsQueryDto,
  UsageLogsQueryDto,
  UsageSummaryQueryDto,
} from './dto/usage-query.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { GetUserData } from '../../shared/decorators/user-data.decorator';
import { UserData } from '../../shared/interfaces/user-data';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

/**
 * Panel administration of API keys and their usage (mounted at `api/api-keys`).
 * Every route needs the session AND the `/api/api-keys` permission
 * (`PermissionGuard` matches the request path), which only SA holds
 * (`AddApiKeysAdminPermission1790600300000`): issuing, rotating or reading the
 * usage of keys is admin-only. The external validation endpoint
 * (`/api/auth/validate-api-key`) lives in `ApiKeyValidateController`, not here.
 */
@Controller('')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ApiKeyController {
  constructor(
    private readonly _apiKeyService: ApiKeyService,
    private readonly _apiKeyUsageMetricsService: ApiKeyUsageMetricsService,
  ) {}

  @Post('create')
  create(
    @GetUserData() userData: UserData,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    return this._apiKeyService.create(createApiKeyDto, userData);
  }

  @Get()
  findAll(@Query('show') show: FindAllOptions) {
    return this._apiKeyService.findAll(show);
  }

  @Get('scopes')
  listScopes() {
    return this._apiKeyService.listScopeCatalog();
  }

  @Get('usage/summary')
  getUsageSummary(@Query() query: UsageSummaryQueryDto) {
    return this._apiKeyUsageMetricsService.getSummary(query);
  }

  @Get('usage/logs')
  getUsageLogs(@Query() query: UsageLogsQueryDto) {
    return this._apiKeyUsageMetricsService.getLogs(query);
  }

  /** Requests per endpoint in the period, with the keys that consumed each one */
  @Get('usage/endpoints')
  getUsageByEndpoint(@Query() query: UsageEndpointsQueryDto) {
    return this._apiKeyUsageMetricsService.getEndpointUsage(query);
  }

  /** The Overview in one call: per system, per bucket and per weekday × hour */
  @Get('usage/overview')
  getUsageOverview(@Query() query: UsageSummaryQueryDto) {
    return this._apiKeyUsageMetricsService.getOverview(query);
  }

  /** Per MIS: how many keys it holds and when any of them was last used */
  @Get('usage/mis-activity')
  getMisActivity() {
    return this._apiKeyUsageMetricsService.getMisActivity();
  }

  @Get(':id/usage')
  getKeyUsage(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ApiKeyUsageQueryDto,
  ) {
    return this._apiKeyUsageMetricsService.getKeyUsage(id, query);
  }

  @Get('get/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this._apiKeyService.findOne(id);
  }

  @Patch(':id')
  update(
    @GetUserData() userData: UserData,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
  ) {
    return this._apiKeyService.update(id, updateApiKeyDto, userData);
  }

  @Patch(':id/revoke')
  revoke(
    @GetUserData() userData: UserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this._apiKeyService.revoke(id, userData);
  }

  @Patch(':id/rotate')
  rotate(
    @GetUserData() userData: UserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this._apiKeyService.rotate(id, userData);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this._apiKeyService.remove(id);
  }
}
