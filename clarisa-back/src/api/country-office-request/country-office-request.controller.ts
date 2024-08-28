import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
  ParseIntPipe,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { CountryOfficeRequestService } from './country-office-request.service';
import { CountryOfficeRequestDto } from './dto/country-office-request.dto';
import { CreateCountryOfficeRequestDto } from './dto/create-country-office-request.dto';
import { RespondRequestDto } from '../../shared/entities/dtos/respond-request.dto';
import { UpdateCountryOfficeRequestDto } from './dto/update-country-office-request.dto';
import { GetUserData } from '../../shared/decorators/user-data.decorator';
import { ResponseDto } from '../../shared/entities/dtos/response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { UserData } from '../../shared/interfaces/user-data';
import {
  ApiBearerAuth,
  ApiBody,
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
@ApiTags('Country Office Requests')
export class CountryOfficeRequestController {
  constructor(
    private readonly countryOfficeRequestService: CountryOfficeRequestService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'source',
    enum: MisOption.getAsEnumLikeObject(),
    required: false,
    description: 'Source of the country office request',
  })
  @ApiQuery({
    name: 'status',
    enum: PartnerStatus.getAsEnumLikeObject(),
    required: false,
    description: 'Status of the country office request',
  })
  @ApiOkResponse({ type: [CountryOfficeRequestDto] })
  @ApiOperation({
    summary:
      'Get all country office requests, optionally filtered by status and source',
  })
  async findAll(
    @Query('status') status: string,
    @Query('source') source: string,
  ) {
    return await this.countryOfficeRequestService.findAll(status, source);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the country office request',
  })
  @ApiOkResponse({ type: [CountryOfficeRequestDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.countryOfficeRequestService.findOne(id);
  }

  @Post('create')
  @ApiQuery({
    name: 'mis',
    enum: MisOption.getAsEnumLikeObject(),
    required: false,
    description:
      'Source of the country office request, optional if not sent on the body',
  })
  @ApiBody({
    type: CreateCountryOfficeRequestDto,
    description: 'The new country request object',
    examples: {
      example: {
        summary:
          'Example of two new country office request (one for each country)',
        value: {
          institutionCode: 1,
          countryIso: ['KE', 'UG'],
          misAcronym: 'CLARISA',
          userId: 3,
          requestSource: 'Swagger',
          externalUserMail: 'test@example.com',
          externalUserName: 'Testing User',
          externalUserComments:
            'You can find the information about the offices in the following link: www.example.com',
        },
      },
    },
  })
  @ApiOkResponse({ type: [CountryOfficeRequestDto] })
  @ApiOperation({
    summary: 'Create a new country office request',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async createCountryOfficeRequests(
    @GetUserData() userData: UserData,
    @Body() newCountryOfficeRequest: CreateCountryOfficeRequestDto,
    @Query('mis') mis: string,
  ): Promise<ResponseDto<CountryOfficeRequestDto[]>> {
    const userDataMis: UserData & { mis: string } = {
      ...userData,
      mis,
    };

    return this.countryOfficeRequestService.createCountryOfficeRequest(
      newCountryOfficeRequest,
      userDataMis,
    );
  }

  @Post('respond')
  @ApiOkResponse({ type: CountryOfficeRequestDto })
  @ApiBody({
    type: RespondRequestDto,
    description: 'The data needed to respond a country request',
    examples: {
      accepting: {
        summary: 'Example of accepting a country office request',
        value: {
          requestId: 1,
          userId: 3,
          accept: true,
          misAcronim: 'CLARISA',
          externalUserMail: 'test@example.com',
          externalUserName: 'Testing User',
          externalUserComments:
            'You can find the information about the offices in the following link: www.example.com',
        },
      },
      rejecting: {
        summary: 'Example of rejecting a country office request',
        value: {
          requestId: 1,
          userId: 3,
          accept: false,
          misAcronim: 'CLARISA',
          rejectJustification: 'The requested country office already exists',
          externalUserMail: 'test@example.com',
          externalUserName: 'Testing User',
          externalUserComments:
            'You can find the information about the offices in the following link: www.example.com',
        },
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async respondCountryOfficeRequest(
    @GetUserData() userData: UserData,
    @Body() respondCountryOfficeRequestDto: RespondRequestDto,
  ): Promise<CountryOfficeRequestDto> {
    return this.countryOfficeRequestService.respondCountryOfficeRequest(
      respondCountryOfficeRequestDto,
      userData,
    );
  }

  @Patch('update')
  @ApiBody({
    type: UpdateCountryOfficeRequestDto,
    description: 'The data needed to update a country request',
    examples: {
      example: {
        summary: 'Example of updating a country office request',
        value: {
          institutionCode: 1,
          misAcronym: 'CLARISA',
          userId: 3,
          requestSource: 'Swagger',
          externalUserMail: 'test@example.com',
          externalUserName: 'Testing User',
          externalUserComments:
            'You can find the information about the offices in the following link: www.example.com',
          id: 1,
          modification_justification:
            'The country linked to the request was wrong',
          countryIso: 'SZ',
        },
      },
    },
  })
  @ApiOkResponse({ type: CountryOfficeRequestDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async updateCountryOfficeRequest(
    @GetUserData() userData: UserData,
    @Body() updateCountryOfficeRequest: UpdateCountryOfficeRequestDto,
  ): Promise<ResponseDto<CountryOfficeRequestDto>> {
    return this.countryOfficeRequestService.updateCountryOfficeRequest(
      updateCountryOfficeRequest,
      userData,
    );
  }
}
