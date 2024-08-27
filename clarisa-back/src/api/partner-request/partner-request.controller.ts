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
  ApiOperation,
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
  @ApiOperation({
    summary:
      'Get all partner requests, optionally filtered by request status, active status, and source',
  })
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
  @ApiOperation({
    summary:
      'Get all partner requests from a specific MIS, optionally filtered by status and source',
  })
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
  @ApiOperation({
    summary: 'Get a partner request by id',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.partnerRequestService.findOne(id);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBody({
    type: CreatePartnerRequestDto,
    required: true,
    description: 'The data to create a new partner request',
    examples: {
      minimum: {
        summary:
          'Example of a new partner request with the minimum data required',
        value: {
          name: 'AKF',
          institutionTypeCode: 39,
          hqCountryIso: 'IN',
          websiteLink: 'http://www.akdn.org/',
          misAcronym: 'CLARISA',
          userId: 3,
          externalUserMail: 'test@example.com',
          externalUserName: 'Testing User',
        },
      },
      full: {
        summary: 'Example of a new partner request with all the data',
        value: {
          name: 'General Electric',
          acronym: 'GE',
          institutionTypeCode: 39,
          hqCountryIso: 'US',
          websiteLink: 'https://www.ge.com/',
          requestSource: 'Swagger',
          misAcronym: 'CLARISA',
          userId: 3,
          externalUserMail: 'test@example.com',
          externalUserName: 'Testing User',
          externalUserComments:
            'This is a legally registered company, as can be seen in the following link: https://www.ge.com/about-us',
          category_1: 'Private Sector',
          category_2: 'Reporting Tool',
        },
      },
    },
  })
  @ApiQuery({
    name: 'source',
    enum: MisOption.getAsEnumLikeObject(),
    required: false,
    description: `The MIS to link this new request to. If it's not provided, the MIS will be taken from the request's body (misAcronym).`,
  })
  @ApiOkResponse({ type: [PartnerRequestDto] })
  @ApiOperation({
    summary: 'Create a new partner request based on the provided data',
  })
  @ApiBearerAuth()
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
    description: 'The data needed to respond a partner request',
    examples: {
      accepting: {
        summary: 'Example of accepting a partner request',
        value: {
          requestId: 2,
          userId: 1,
          accept: true,
          misAcronim: 'CLARISA',
          externalUserMail: 'test@example.com',
          externalUserName: 'Testing User',
          externalUserComments:
            'This is a legally registered company, as can be seen in the following link: https://www.ge.com/about-us',
        },
      },
      rejecting: {
        summary: 'Example of rejecting a partner request',
        value: {
          requestId: 1,
          userId: 3,
          accept: false,
          misAcronim: 'CLARISA',
          rejectJustification:
            'The requested institution already exists in CLARISA as "Aga Khan Foundation"',
          externalUserMail: 'test@example.com',
          externalUserName: 'Testing User',
        },
      },
    },
  })
  @ApiOkResponse({ type: [PartnerRequestDto] })
  @ApiOperation({
    summary: 'Respond to a partner request',
  })
  @ApiBearerAuth()
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
    description: 'The data needed to update a partner request',
    examples: {
      example: {
        summary: 'Example of updating a partner request',
        value: {
          name: 'Aga Khan Foundation',
          acronym: 'AKF',
          institutionTypeCode: 39,
          hqCountryIso: 'IN',
          websiteLink: 'http://www.akdn.org/',
          misAcronym: 'CLARISA',
          userId: 3,
          externalUserMail: 'test@example.com',
          externalUserName: 'Testing User',
          id: 1,
          modification_justification:
            'Spelling out acronym in name; adding acronym',
        },
      },
    },
  })
  @ApiOkResponse({ type: [PartnerRequestDto] })
  @ApiOperation({
    summary: 'Update a partner request based on the provided data',
  })
  @ApiBearerAuth()
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
  @ApiExcludeEndpoint()
  async createBulk(@Body() createBulkPartner: CreateBulkPartnerRequestDto) {
    const result: any =
      await this.partnerRequestService.createBulk(createBulkPartner);
    return result;
  }
}
