import {
  Controller,
  Get,
  Param,
  ClassSerializerInterceptor,
  UseInterceptors,
  Query,
  ParseIntPipe,
  Post,
  UseGuards,
  Body,
  Patch,
} from '@nestjs/common';
import { GetUserData } from '../../shared/decorators/user-data.decorator';
import { RespondRequestDto } from '../../shared/entities/dtos/respond-request.dto';
import { ResponseDto } from '../../shared/entities/dtos/response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { UserData } from '../../shared/interfaces/user-data';
import { CreatePartnerRequestDto } from './dto/create-partner-request.dto';
import { PartnerRequestDto } from './dto/partner-request.dto';
import { UpdatePartnerRequestDto } from './dto/update-partner-request.dto';
import { PartnerRequestService } from './partner-request.service';
import { CreateBulkPartnerRequestDto } from './dto/create-bulk-partner-request.dto';
import { FindAllOptions } from 'src/shared/entities/enums/find-all-options';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PartnerStatus } from '../../shared/entities/enums/partner-status';
import { MisOption } from '../../shared/entities/enums/mises-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Partner Request')
export class PartnerRequestController {
  constructor(private readonly partnerRequestService: PartnerRequestService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all partner requests. Defaults to active.',
  })
  @ApiQuery({
    name: 'source',
    enum: MisOption.getAsEnumLikeObject(),
    required: false,
    description:
      'Show only partner requests from a specific MIS. Defaults to all.',
  })
  @ApiQuery({
    name: 'status',
    enum: PartnerStatus.getAsEnumLikeObject(),
    required: false,
    description:
      'Show only partner requests with a specific status. Defaults to pending.',
  })
  @ApiOkResponse({ type: [PartnerRequestDto] })
  async findAll(
    @Query('status') status: string,
    @Query('source') source: string,
    @Query('show') show: FindAllOptions,
  ) {
    return await this.partnerRequestService.findAll(status, source, show);
  }

  @Get('stadistics')
  @ApiExcludeEndpoint()
  async stadisticsfindAll(@Query('source') source: string) {
    return await this.partnerRequestService.statisticsPartnerRequest(source);
  }

  @Get('all/:mis')
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all partner requests. Defaults to active.',
  })
  @ApiParam({
    name: 'mis',
    type: String,
    required: true,
    description:
      'The acronym of the MIS to filter the partner requests. Defaults to all.',
  })
  @ApiOkResponse({ type: [PartnerRequestDto] })
  async findAllMis(@Query('status') status: string, @Param('mis') mis: string) {
    return await this.partnerRequestService.findAll(status, mis);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the partner request',
  })
  @ApiOkResponse({ type: [PartnerRequestDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.partnerRequestService.findOne(id);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBody({
    type: CreatePartnerRequestDto,
    required: true,
  })
  @ApiQuery({
    name: 'source',
    enum: MisOption.getAsEnumLikeObject(),
    required: true,
    description: 'The MIS to link this new request to',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: [PartnerRequestDto] })
  async createPartnerRequest(
    @GetUserData() userData: UserData,
    @Body() newPartnerRequest: CreatePartnerRequestDto,
    @Query('mis') mis: string,
  ): Promise<ResponseDto<PartnerRequestDto>> {
    const userDataMis: UserData & { mis: string } = {
      ...userData,
      mis,
    };

    return this.partnerRequestService.createPartnerRequest(
      newPartnerRequest,
      userDataMis,
    );
  }

  @Post('respond')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBody({
    type: RespondRequestDto,
    required: true,
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: [PartnerRequestDto] })
  async respondPartnerRequest(
    @GetUserData() userData: UserData,
    @Body() respondPartnerRequestDto: RespondRequestDto,
  ): Promise<PartnerRequestDto> {
    return this.partnerRequestService.respondPartnerRequest(
      respondPartnerRequestDto,
      userData,
    );
  }

  @Patch('update')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBody({
    type: UpdatePartnerRequestDto,
    required: true,
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: [PartnerRequestDto] })
  async updatePartnerRequest(
    @GetUserData() userData: UserData,
    @Body() updatePartnerRequest: UpdatePartnerRequestDto,
  ): Promise<ResponseDto<PartnerRequestDto>> {
    return this.partnerRequestService.updatePartnerRequest(
      updatePartnerRequest,
      userData,
    );
  }

  @Post('create-bulk')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBody({
    type: CreateBulkPartnerRequestDto,
    required: true,
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: [PartnerRequestDto] })
  async createBulk(@Body() createBulkPartner: CreateBulkPartnerRequestDto) {
    const result: any =
      await this.partnerRequestService.createBulk(createBulkPartner);
    return result;
  }
}
