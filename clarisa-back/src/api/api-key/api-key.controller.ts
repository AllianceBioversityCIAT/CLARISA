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
import {
  ApiKeyUsageQueryDto,
  UsageLogsQueryDto,
  UsageSummaryQueryDto,
} from './dto/usage-query.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { GetUserData } from '../../shared/decorators/user-data.decorator';
import { UserData } from '../../shared/interfaces/user-data';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller('')
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
  @UseGuards(JwtAuthGuard)
  create(
    @GetUserData() userData: UserData,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    return this._apiKeyService.create(createApiKeyDto, userData);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query('show') show: FindAllOptions) {
    return this._apiKeyService.findAll(show);
  }

  @Get('scopes')
  @UseGuards(JwtAuthGuard)
  listScopes() {
    return this._apiKeyService.listScopeCatalog();
  }

  @Get('usage/summary')
  @UseGuards(JwtAuthGuard)
  getUsageSummary(@Query() query: UsageSummaryQueryDto) {
    return this._apiKeyUsageMetricsService.getSummary(query);
  }

  @Get('usage/logs')
  @UseGuards(JwtAuthGuard)
  getUsageLogs(@Query() query: UsageLogsQueryDto) {
    return this._apiKeyUsageMetricsService.getLogs(query);
  }

  @Get(':id/usage')
  @UseGuards(JwtAuthGuard)
  getKeyUsage(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ApiKeyUsageQueryDto,
  ) {
    return this._apiKeyUsageMetricsService.getKeyUsage(id, query);
  }

  @Get('get/:id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this._apiKeyService.findOne(id);
  }

  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard)
  revoke(
    @GetUserData() userData: UserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this._apiKeyService.revoke(id, userData);
  }

  @Patch(':id/rotate')
  @UseGuards(JwtAuthGuard)
  rotate(
    @GetUserData() userData: UserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this._apiKeyService.rotate(id, userData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this._apiKeyService.remove(id);
  }
}
