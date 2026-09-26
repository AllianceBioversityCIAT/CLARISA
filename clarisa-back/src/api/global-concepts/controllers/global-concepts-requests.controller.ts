import {
  Body,
  Controller,
  ForbiddenException,
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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../../shared/guards/api-key.guard';
import { GetUserData } from '../../../shared/decorators/user-data.decorator';
import { GetApiKeyAuth } from '../../../shared/decorators/get-api-key-auth.decorator';
import { RequireApiKeyScope } from '../../../shared/decorators/require-api-key-scope.decorator';
import { UserData } from '../../../shared/interfaces/user-data';
import { ApiKeyAuthContext } from '../../api-key/interfaces/api-key-auth-context';
import { GlobalConceptsEnabledGuard } from '../utils/feature-enabled.guard';
import { GcProposalOrigin } from '../entities/gc-proposal.entity';
import { GcHistoryAction } from '../entities/gc-history.entity';
import { RequestsService } from '../services/requests.service';
import { ConceptsAdminService } from '../services/concepts-admin.service';
import {
  RequestTransitionDto,
  ResubmitRequestDto,
  StartPublicRequestDto,
  SubmitRequestDto,
  VerifyPublicRequestDto,
} from '../dto/request.dto';
import { CreateConceptDto, UpdateConceptDto } from '../dto/concept-admin.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

/** Platform identity of a key: its MIS acronym, lower-case (V19). */
const platformOf = (auth: ApiKeyAuthContext | undefined) => {
  const code = auth?.mis?.acronym?.trim().toLowerCase();
  if (!code)
    throw new ForbiddenException('This API key is not linked to a platform');
  return code;
};

/**
 * The three doors to submit a concept request (Audit correction 2), none of
 * which changes CLARISA's login:
 *
 * - the public form (email + one-time link), for anyone in CGIAR;
 * - a signed-in CLARISA user;
 * - a platform with its CLARISA API key, on behalf of its own users.
 */
@ApiTags('Global Concepts — requests')
@Controller()
@UseGuards(GlobalConceptsEnabledGuard)
@UsePipes(pipe)
export class GlobalConceptsRequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post(':scheme/requests/start')
  @ApiOperation({
    summary:
      'Public form: submit a request and receive a confirmation link by email',
  })
  start(@Param('scheme') scheme: string, @Body() dto: StartPublicRequestDto) {
    return this.requests.startPublic(scheme, dto);
  }

  @Post('requests/verify')
  @ApiOperation({
    summary: 'Public form: confirm the email link; returns the follow-up token',
  })
  verify(@Body() dto: VerifyPublicRequestDto) {
    return this.requests.verifyPublic(dto.token);
  }

  @Get('requests/:id')
  @ApiOperation({
    summary: 'Follow a request with the token from the confirmation email',
  })
  follow(@Param('id', ParseIntPipe) id: number, @Query('token') token: string) {
    return this.requests.getForRequester(id, { accessToken: token });
  }

  @Post('requests/:id/resubmit')
  @ApiOperation({
    summary:
      'Update a request after changes were requested (public form token)',
  })
  resubmitPublic(
    @Param('id', ParseIntPipe) id: number,
    @Query('token') token: string,
    @Body() dto: ResubmitRequestDto,
  ) {
    return this.requests.resubmit(id, dto, {
      accessToken: token,
      email: 'requester',
    });
  }

  @Post(':scheme/requests')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Signed-in CLARISA user: submit a concept request' })
  submitAsUser(
    @Param('scheme') scheme: string,
    @Body() dto: SubmitRequestDto,
    @GetUserData() user: UserData,
  ) {
    return this.requests.submit(
      scheme,
      { ...dto, requester_email: user.email },
      {
        origin: GcProposalOrigin.CLARISA_USER,
        email: user.email,
      },
    );
  }
}

/**
 * Platforms with a CLARISA API key (Partner Requests pattern). `request`
 * submits and follows requests; `write` and `review` act only on the scheme
 * the platform owns — never on the global MELIAF scheme (D5c).
 */
@ApiTags('Global Concepts — platforms')
@Controller('platform')
@UseGuards(GlobalConceptsEnabledGuard, ApiKeyGuard)
@UsePipes(pipe)
export class GlobalConceptsPlatformController {
  constructor(
    private readonly requests: RequestsService,
    private readonly admin: ConceptsAdminService,
  ) {}

  @Post(':scheme/requests')
  @RequireApiKeyScope('global-concepts:request')
  submit(
    @Param('scheme') scheme: string,
    @Body() dto: SubmitRequestDto,
    @GetApiKeyAuth() auth: ApiKeyAuthContext,
  ) {
    const platform = platformOf(auth);
    return this.requests.submit(scheme, dto, {
      origin: GcProposalOrigin.PLATFORM,
      email: dto.requester_email ?? '',
      platform,
    });
  }

  @Get('requests/:id')
  @RequireApiKeyScope('global-concepts:request')
  status(
    @Param('id', ParseIntPipe) id: number,
    @GetApiKeyAuth() auth: ApiKeyAuthContext,
  ) {
    return this.requests.getForRequester(id, { platform: platformOf(auth) });
  }

  @Post('requests/:id/resubmit')
  @RequireApiKeyScope('global-concepts:request')
  resubmit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResubmitRequestDto,
    @GetApiKeyAuth() auth: ApiKeyAuthContext,
  ) {
    const platform = platformOf(auth);
    return this.requests.resubmit(id, dto, {
      platform,
      email: `platform:${platform}`,
    });
  }

  @Post('requests/:id/transition')
  @RequireApiKeyScope('global-concepts:review')
  transition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequestTransitionDto,
    @GetApiKeyAuth() auth: ApiKeyAuthContext,
  ) {
    const platform = platformOf(auth);
    return this.requests.transition(id, dto, {
      email: `platform:${platform}`,
      platform,
    });
  }

  @Post(':scheme/concepts')
  @RequireApiKeyScope('global-concepts:write')
  async create(
    @Param('scheme') scheme: string,
    @Body() dto: CreateConceptDto,
    @GetApiKeyAuth() auth: ApiKeyAuthContext,
  ) {
    const platform = await this.assertOwner(scheme, auth);
    return this.admin.create(scheme, dto, {
      email: `platform:${platform}`,
      action: GcHistoryAction.DIRECT_EDIT,
    });
  }

  @Patch(':scheme/concepts/:termId')
  @RequireApiKeyScope('global-concepts:write')
  async update(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: UpdateConceptDto,
    @GetApiKeyAuth() auth: ApiKeyAuthContext,
  ) {
    const platform = await this.assertOwner(scheme, auth);
    return this.admin.update(scheme, termId, dto, {
      email: `platform:${platform}`,
      action: GcHistoryAction.DIRECT_EDIT,
    });
  }

  /** `write` is scoped to the scheme the platform owns (D5c). */
  private async assertOwner(scheme: string, auth: ApiKeyAuthContext) {
    const platform = platformOf(auth);
    const owner = await this.admin.ownerOf(scheme);
    if (owner !== platform) {
      throw new ForbiddenException(
        'A platform can only write in the scheme it owns',
      );
    }
    return platform;
  }
}
