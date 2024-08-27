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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AppSecretDto } from './dto/app-secret.dto';

@Controller()
@ApiTags('App Secrets')
export class AppSecretController {
  constructor(private readonly appSecretService: AppSecretService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBody({
    type: CreateAppSecretDto,
    required: true,
  })
  @ApiOkResponse({ type: [AppSecretDto] })
  @ApiOperation({
    summary: 'Create a new app secret based on the provided data',
  })
  @ApiBearerAuth()
  create(
    @GetUserData() userData: UserData,
    @Body() createAppSecretDto: CreateAppSecretDto,
  ) {
    return this.appSecretService.create(createAppSecretDto, userData);
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBody({
    type: ValidateAppSecretDto,
    required: true,
  })
  @ApiOkResponse({ type: [AppSecretDto] })
  @ApiOperation({
    summary: 'Validate an app secret based on the provided data',
  })
  @ApiBearerAuth()
  validate(@Body() validateAppSecret: ValidateAppSecretDto) {
    return this.appSecretService.validateAppSecret(validateAppSecret);
  }

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all app secrets. Defaults to active.',
  })
  @ApiOkResponse({ type: [AppSecretDto] })
  @ApiOperation({
    summary: 'Get all app secrets, optionally filtered by status',
  })
  findAll(@Query('show') show: FindAllOptions) {
    return this.appSecretService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the secret',
  })
  @ApiOkResponse({ type: [AppSecretDto] })
  @ApiOperation({
    summary: 'Get an app secret by id',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.appSecretService.findOne(id);
  }
}
