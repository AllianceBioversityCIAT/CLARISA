import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Post,
  UseGuards,
  Body,
} from '@nestjs/common';
import { MisService } from './mis.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MisDto } from './dto/mis.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { GetUserData } from '../../shared/decorators/user-data.decorator';
import { UserDataDto } from '../../shared/entities/dtos/user-data.dto';
import { CreateMisDto } from './dto/create-mis.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('MIS')
export class MisController {
  constructor(private readonly _misService: MisService) {}

  @Post('create')
  @ApiBody({
    type: CreateMisDto,
    required: true,
    description: 'The data to create a new MIS',
    examples: {
      example: {
        summary: 'Example of a new MIS',
        value: {
          name: 'New System',
          acronym: 'NS',
          environment: 'PROD',
          contact_point_id: 2,
        },
      },
    },
  })
  @ApiOkResponse({ type: [MisDto] })
  @ApiOperation({
    summary: 'Create a new MIS based on the provided data',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  create(
    @GetUserData() userData: UserDataDto,
    @Body() createMisDto: CreateMisDto,
  ) {
    return this._misService.create(createMisDto, userData);
  }

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all MISes. Defaults to active.',
  })
  @ApiOkResponse({ type: [MisDto] })
  @ApiOperation({
    summary: 'Get all MISes, optionally filtered by status',
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this._misService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the MIS',
  })
  @ApiOkResponse({ type: [MisDto] })
  @ApiOperation({
    summary: 'Get a MIS by id',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this._misService.findOne(id);
  }

  @Get('get-metadata/:id')
  @UseGuards(JwtAuthGuard)
  async findMetadataById(@Param('id', ParseIntPipe) id: number) {
    return await this._misService.findMetadataById(id);
  }
}
