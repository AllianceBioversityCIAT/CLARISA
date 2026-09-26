import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../shared/guards/permission.guard';
import { GetUserData } from '../../../shared/decorators/user-data.decorator';
import { UserData } from '../../../shared/interfaces/user-data';
import { GlobalConceptsEnabledGuard } from '../utils/feature-enabled.guard';
import {
  ConceptsAdminService,
  GcActor,
} from '../services/concepts-admin.service';
import { ReleasesService } from '../services/releases.service';
import { GcHistoryAction } from '../entities/gc-history.entity';
import {
  ConceptLabelsDto,
  ConceptStatusDto,
  CreateConceptDto,
  MappingDto,
  MergeDto,
  RelationDto,
  UpdateConceptDto,
} from '../dto/concept-admin.dto';
import { PublishReleaseDto } from '../dto/release.dto';

/**
 * Admin surface of Global Concepts (`/api/global-concepts/admin`). Every write
 * made here is a direct admin edit and is logged as such (`direct_edit`); the
 * people who are not admins go through concept requests instead.
 *
 * `PermissionGuard` matches the path against the user's permissions, seeded by
 * `SeedGlobalConceptsAdminPermission1790500100000`.
 */
@ApiExcludeController()
@Controller('admin')
@UseGuards(GlobalConceptsEnabledGuard, JwtAuthGuard, PermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class GlobalConceptsAdminController {
  constructor(
    private readonly admin: ConceptsAdminService,
    private readonly releases: ReleasesService,
  ) {}

  private actor(user: UserData): GcActor {
    return { email: user.email, action: GcHistoryAction.DIRECT_EDIT };
  }

  @Get(':scheme/concepts')
  list(@Param('scheme') scheme: string, @Query('status') status?: string) {
    return this.admin.list(scheme, status);
  }

  @Get(':scheme/concepts/:termId')
  get(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
  ) {
    return this.admin.get(scheme, termId);
  }

  @Post(':scheme/concepts')
  create(
    @Param('scheme') scheme: string,
    @Body() dto: CreateConceptDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.create(scheme, dto, {
      ...this.actor(user),
      action: GcHistoryAction.CREATE,
    });
  }

  @Patch(':scheme/concepts/:termId')
  update(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: UpdateConceptDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.update(scheme, termId, dto, this.actor(user));
  }

  @Patch(':scheme/concepts/:termId/status')
  setStatus(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: ConceptStatusDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.setStatus(scheme, termId, dto, this.actor(user));
  }

  @Put(':scheme/concepts/:termId/labels')
  setLabels(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: ConceptLabelsDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.setLabels(scheme, termId, dto, this.actor(user));
  }

  @Post(':scheme/concepts/:termId/relations')
  addRelation(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: RelationDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.addRelation(scheme, termId, dto, this.actor(user));
  }

  /** POST and not DELETE: the relation is identified by a body (kind + target). */
  @Post(':scheme/concepts/:termId/relations/remove')
  removeRelation(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: RelationDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.removeRelation(scheme, termId, dto, this.actor(user));
  }

  @Post(':scheme/concepts/:termId/mappings')
  upsertMapping(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: MappingDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.upsertMapping(scheme, termId, dto, this.actor(user));
  }

  @Delete(':scheme/concepts/:termId/mappings/:mappingId')
  removeMapping(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('mappingId', ParseIntPipe) mappingId: number,
    @GetUserData() user: UserData,
  ) {
    return this.admin.removeMapping(
      scheme,
      termId,
      mappingId,
      this.actor(user),
    );
  }

  @Post(':scheme/concepts/:termId/merge')
  merge(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: MergeDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.merge(scheme, termId, dto, this.actor(user));
  }

  @Get(':scheme/quality')
  quality(@Param('scheme') scheme: string) {
    return this.releases.preview(scheme);
  }

  @Post(':scheme/releases')
  publish(
    @Param('scheme') scheme: string,
    @Body() dto: PublishReleaseDto,
    @GetUserData() user: UserData,
  ) {
    return this.releases.publish(scheme, dto, user.email);
  }
}
