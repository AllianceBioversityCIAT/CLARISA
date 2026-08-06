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
import { GetApiKeyAuth } from '../../shared/decorators/get-api-key-auth.decorator';
import { RequireApiKeyScope } from '../../shared/decorators/require-api-key-scope.decorator';
import { RespondRequestDto } from '../../shared/entities/dtos/respond-request.dto';
import { ResponseDto } from '../../shared/entities/dtos/response.dto';
import { CompositeAuthGuard } from '../../shared/guards/composite-auth.guard';
import { HybridAuthorizationGuard } from '../../shared/guards/hybrid-authorization.guard';
import { UserData } from '../../shared/interfaces/user-data';
import { ApiKeyAuthContext } from '../api-key/interfaces/api-key-auth-context';
import { CreatePartnerRequestDto } from './dto/create-partner-request.dto';
import { PartnerRequestDto } from './dto/partner-request.dto';
import { UpdatePartnerRequestDto } from './dto/update-partner-request.dto';
import { PartnerRequestService } from './partner-request.service';
import { BulkPartnerRequestDto } from './dto/create-partner-dto';
import { FindAllOptions } from 'src/shared/entities/enums/find-all-options';
import { resolvePartnerRequestActor } from './utils/resolve-partner-request-actor';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class PartnerRequestController {
  constructor(private readonly partnerRequestService: PartnerRequestService) {}

  @Get()
  async findAll(
    @Query('status') status: string,
    @Query('source') source: string,
    @Query('show') show: FindAllOptions,
  ) {
    return await this.partnerRequestService.findAll(status, source, show);
  }

  @Get('stadistics')
  async stadisticsfindAll(@Query('source') source: string) {
    return await this.partnerRequestService.statisticsPartnerRequest(source);
  }

  @Get('all/:mis')
  async findAllMis(@Query('status') status: string, @Param('mis') mis: string) {
    return await this.partnerRequestService.findAll(status, mis);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.partnerRequestService.findOne(id);
  }

  @Post('create')
  @UseGuards(CompositeAuthGuard, HybridAuthorizationGuard)
  @RequireApiKeyScope('partner-requests:create')
  async createPartnerRequest(
    @GetUserData() userData: UserData | undefined,
    @GetApiKeyAuth() apiKeyAuth: ApiKeyAuthContext | undefined,
    @Body() newPartnerRequest: CreatePartnerRequestDto,
    @Query('mis') mis: string,
  ): Promise<ResponseDto<PartnerRequestDto>> {
    const actor = resolvePartnerRequestActor(userData, apiKeyAuth, {
      userId: newPartnerRequest.userId,
      email: newPartnerRequest.externalUserMail,
    });

    const userDataMis: UserData & { mis: string } = {
      ...actor,
      mis: mis || apiKeyAuth?.mis?.acronym || '',
    };

    return this.partnerRequestService.createPartnerRequest(
      newPartnerRequest,
      userDataMis,
    );
  }

  @Post('respond')
  @UseGuards(CompositeAuthGuard, HybridAuthorizationGuard)
  @RequireApiKeyScope('partner-requests:create')
  async respondPartnerRequest(
    @GetUserData() userData: UserData | undefined,
    @GetApiKeyAuth() apiKeyAuth: ApiKeyAuthContext | undefined,
    @Body() respondPartnerRequestDto: RespondRequestDto,
  ): Promise<PartnerRequestDto> {
    const actor = resolvePartnerRequestActor(userData, apiKeyAuth, {
      userId: respondPartnerRequestDto.userId,
      email: respondPartnerRequestDto.externalUserMail,
    });

    return this.partnerRequestService.respondPartnerRequest(
      respondPartnerRequestDto,
      actor,
    );
  }

  @Patch('update')
  @UseGuards(CompositeAuthGuard, HybridAuthorizationGuard)
  @RequireApiKeyScope('partner-requests:create')
  async updatePartnerRequest(
    @GetUserData() userData: UserData | undefined,
    @GetApiKeyAuth() apiKeyAuth: ApiKeyAuthContext | undefined,
    @Body() updatePartnerRequest: UpdatePartnerRequestDto,
  ): Promise<ResponseDto<PartnerRequestDto>> {
    const actor = resolvePartnerRequestActor(userData, apiKeyAuth, {
      userId: updatePartnerRequest.userId,
      email: updatePartnerRequest.externalUserMail,
    });

    return this.partnerRequestService.updatePartnerRequest(
      updatePartnerRequest,
      actor,
    );
  }

  @Post('create-bulk')
  @UseGuards(CompositeAuthGuard, HybridAuthorizationGuard)
  @RequireApiKeyScope('partner-requests:create')
  async createBulk(@Body() createBulkPartner: BulkPartnerRequestDto) {
    return this.partnerRequestService.createBulk(createBulkPartner);
  }
}
