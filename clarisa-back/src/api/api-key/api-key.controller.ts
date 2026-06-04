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
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
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
  constructor(private readonly _apiKeyService: ApiKeyService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  create(
    @GetUserData() userData: UserData,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    return this._apiKeyService.create(createApiKeyDto, userData);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  findAll(@Query('show') show: FindAllOptions) {
    return this._apiKeyService.findAll(show);
  }

  @Get('scopes')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  listScopes() {
    return this._apiKeyService.listScopeCatalog();
  }

  @Get('get/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this._apiKeyService.findOne(id);
  }

  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  revoke(
    @GetUserData() userData: UserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this._apiKeyService.revoke(id, userData);
  }

  @Patch(':id/rotate')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  rotate(
    @GetUserData() userData: UserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this._apiKeyService.rotate(id, userData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this._apiKeyService.remove(id);
  }
}
