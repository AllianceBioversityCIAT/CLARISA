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
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MisDto } from './dto/mis.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { GetUserData } from '../../shared/decorators/user-data.decorator';
import { UserData } from '../../shared/interfaces/user-data';
import { CreateMisDto } from './dto/create-mis.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('MIS')
export class MisController {
  constructor(private readonly _misService: MisService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  create(
    @GetUserData() userData: UserData,
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
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this._misService.findOne(id);
  }
}
