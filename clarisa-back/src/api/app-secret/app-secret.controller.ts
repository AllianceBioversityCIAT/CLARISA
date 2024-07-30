import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AppSecretService } from './app-secret.service';
import { CreateAppSecretDto } from './dto/create-app-secret.dto';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { UserData } from '../../shared/interfaces/user-data';
import { GetUserData } from '../../shared/decorators/user-data.decorator';
import { ValidateAppSecretDto } from './dto/validate-app-secret.dto';

@Controller('')
export class AppSecretController {
  constructor(private readonly appSecretService: AppSecretService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  create(
    @GetUserData() userData: UserData,
    @Body() createAppSecretDto: CreateAppSecretDto,
  ) {
    return this.appSecretService.create(createAppSecretDto, userData);
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  validate(@Body() validateAppSecret: ValidateAppSecretDto) {
    return this.appSecretService.validateAppSecret(validateAppSecret);
  }

  @Get()
  findAll(@Query('show') show: FindAllOptions) {
    return this.appSecretService.findAll(show);
  }

  @Get('get/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.appSecretService.findOne(+id);
  }
}
