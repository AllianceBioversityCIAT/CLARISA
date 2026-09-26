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
import {
  GlobalConceptsAiEnabledGuard,
  GlobalConceptsEnabledGuard,
} from '../utils/feature-enabled.guard';
import { AiService } from '../services/ai.service';
import { AiAssistService } from '../services/ai-assist.service';
import {
  ImportConceptsDto,
  MapColumnsDto,
  NormalizeValuesDto,
} from '../dto/ai.dto';
import { ConceptsImportService } from '../services/concepts-import.service';
import { ConceptsCatalogService } from '../services/concepts-catalog.service';
import {
  CollectionDto,
  CollectionMembersDto,
  ListValueDto,
  UpdateCollectionDto,
  UpdateListValueDto,
} from '../dto/catalog.dto';
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
import { RequestsService } from '../services/requests.service';
import { RequestTransitionDto } from '../dto/request.dto';

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
    private readonly requests: RequestsService,
    private readonly ai: AiService,
    private readonly assist: AiAssistService,
    private readonly importer: ConceptsImportService,
    private readonly catalog: ConceptsCatalogService,
  ) {}

  private actor(user: UserData): GcActor {
    return { email: user.email, action: GcHistoryAction.DIRECT_EDIT };
  }

  // ------------------------------------------------------------ AI (advisory)

  /** Lets the front hide the AI buttons; answers even while AI is off. */
  @Get('ai/status')
  aiStatus() {
    return this.ai.usage();
  }

  @Post('ai/map-columns')
  @UseGuards(GlobalConceptsAiEnabledGuard)
  mapColumns(@Body() dto: MapColumnsDto) {
    return this.assist.mapColumns(dto.headers, dto.rows);
  }

  @Post(':scheme/ai/normalize')
  @UseGuards(GlobalConceptsAiEnabledGuard)
  normalize(@Param('scheme') scheme: string, @Body() dto: NormalizeValuesDto) {
    return this.assist.normalizeValues(scheme, dto.list, dto.values);
  }

  @Post('requests/:id/ai-recommendation')
  @UseGuards(GlobalConceptsAiEnabledGuard)
  recommend(@Param('id', ParseIntPipe) id: number) {
    return this.assist.recommend(id);
  }

  // --------------------------------------------------- collections and lists

  @Get(':scheme/collections')
  collections(@Param('scheme') scheme: string) {
    return this.catalog.collections(scheme);
  }

  @Post(':scheme/collections')
  createCollection(
    @Param('scheme') scheme: string,
    @Body() dto: CollectionDto,
  ) {
    return this.catalog.createCollection(scheme, dto);
  }

  @Patch(':scheme/collections/:code')
  updateCollection(
    @Param('scheme') scheme: string,
    @Param('code') code: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.catalog.updateCollection(scheme, code, dto);
  }

  @Put(':scheme/collections/:code/members')
  setMembers(
    @Param('scheme') scheme: string,
    @Param('code') code: string,
    @Body() dto: CollectionMembersDto,
  ) {
    return this.catalog.setMembers(scheme, code, dto);
  }

  @Delete(':scheme/collections/:code')
  deleteCollection(
    @Param('scheme') scheme: string,
    @Param('code') code: string,
  ) {
    return this.catalog.deleteCollection(scheme, code);
  }

  @Get(':scheme/lists')
  listValues(@Param('scheme') scheme: string) {
    return this.catalog.listValues(scheme);
  }

  @Post(':scheme/lists')
  addListValue(@Param('scheme') scheme: string, @Body() dto: ListValueDto) {
    return this.catalog.addListValue(scheme, dto);
  }

  @Patch(':scheme/lists/:id')
  updateListValue(
    @Param('scheme') scheme: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateListValueDto,
  ) {
    return this.catalog.updateListValue(scheme, id, dto);
  }

  // ------------------------------------------------------------------ import

  /** Dry run: what the import would do, row by row. Writes nothing. */
  @Post(':scheme/import/preview')
  importPreview(
    @Param('scheme') scheme: string,
    @Body() dto: ImportConceptsDto,
  ) {
    return this.importer.preview(scheme, dto.rows);
  }

  /** Writes the same plan in one transaction, all or nothing. */
  @Post(':scheme/import')
  importRows(
    @Param('scheme') scheme: string,
    @Body() dto: ImportConceptsDto,
    @GetUserData() user: UserData,
  ) {
    return this.importer.import(
      scheme,
      dto.rows,
      { email: user.email },
      dto.skip_invalid === true,
    );
  }

  // ---------------------------------------------------------------- concepts

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

  @Get(':scheme/requests')
  requestList(@Param('scheme') scheme: string, @Query('state') state?: string) {
    return this.requests.list(scheme, state);
  }

  @Get('requests/:id')
  requestDetail(@Param('id', ParseIntPipe) id: number) {
    return this.requests.getForAdmin(id);
  }

  @Post('requests/:id/transition')
  transition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequestTransitionDto,
    @GetUserData() user: UserData,
  ) {
    return this.requests.transition(id, dto, { email: user.email });
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
