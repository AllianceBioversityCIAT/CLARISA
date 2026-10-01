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
import { EmbeddingsService } from '../services/embeddings.service';
import { ConceptGraphLoader } from '../services/concept-graph.loader';
import { DataSource } from 'typeorm';
import {
  AiDraftDto,
  ImportConceptsDto,
  MapColumnsDto,
  NormalizeValuesDto,
  SemanticSearchDto,
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
import { IconDto, UpdateIconDto } from '../dto/icon.dto';
import { CreateFieldDto, UpdateFieldDto } from '../dto/field.dto';
import { ConceptsIconsService } from '../services/concepts-icons.service';
import { ConceptsFieldsService } from '../services/concepts-fields.service';
import { UsageService } from '../services/usage.service';
import { PlatformUsageService } from '../services/platform-usage.service';
import { SchemeCode } from '../utils/scheme-code.decorator';

/**
 * Admin surface of Global Concepts (`/api/meliaf-taxonomy/admin`). Every write
 * made here is a direct admin edit and is logged as such (`direct_edit`); the
 * people who are not admins go through concept requests instead.
 *
 * `PermissionGuard` matches the path against the user's permissions, seeded by
 * `SeedGlobalConceptsAdminPermission1790500100000` and moved to the
 * `concepts` prefix by the route-rename migrations 1790500300000 and
 * 1790500400000.
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
    private readonly embeddings: EmbeddingsService,
    private readonly loader: ConceptGraphLoader,
    private readonly dataSource: DataSource,
    private readonly icons: ConceptsIconsService,
    private readonly fields: ConceptsFieldsService,
    private readonly usage: UsageService,
    private readonly platformUsage: PlatformUsageService,
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

  @Post('ai/normalize')
  @UseGuards(GlobalConceptsAiEnabledGuard)
  normalize(@SchemeCode() scheme: string, @Body() dto: NormalizeValuesDto) {
    return this.assist.normalizeValues(scheme, dto.list, dto.values);
  }

  /** Embeds concepts whose label or definition changed; costs cents for a whole scheme. */
  @Post('ai/embeddings/refresh')
  @UseGuards(GlobalConceptsAiEnabledGuard)
  async refreshEmbeddings(@SchemeCode() scheme: string) {
    return this.embeddings.refresh(
      await this.loader.scheme(this.dataSource.manager, scheme),
    );
  }

  /** Semantic search for editors; the text is embedded and discarded. */
  @Post('ai/semantic-search')
  @UseGuards(GlobalConceptsAiEnabledGuard)
  async semanticSearch(
    @SchemeCode() scheme: string,
    @Body() dto: SemanticSearchDto,
  ) {
    return this.embeddings.search(
      await this.loader.scheme(this.dataSource.manager, scheme),
      dto.text,
      dto.limit ?? 10,
    );
  }

  /** Drafts editorial fields from label + definition; nothing is saved. */
  @Post('ai/draft')
  @UseGuards(GlobalConceptsAiEnabledGuard)
  draft(@SchemeCode() scheme: string, @Body() dto: AiDraftDto) {
    return this.assist.draft(scheme, dto);
  }

  @Post('requests/:id/ai-recommendation')
  @UseGuards(GlobalConceptsAiEnabledGuard)
  recommend(@Param('id', ParseIntPipe) id: number) {
    return this.assist.recommend(id);
  }

  // --------------------------------------------------- collections and lists

  @Get('collections')
  collections(@SchemeCode() scheme: string) {
    return this.catalog.collections(scheme);
  }

  @Post('collections')
  createCollection(@SchemeCode() scheme: string, @Body() dto: CollectionDto) {
    return this.catalog.createCollection(scheme, dto);
  }

  @Patch('collections/:code')
  updateCollection(
    @SchemeCode() scheme: string,
    @Param('code') code: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.catalog.updateCollection(scheme, code, dto);
  }

  @Put('collections/:code/members')
  setMembers(
    @SchemeCode() scheme: string,
    @Param('code') code: string,
    @Body() dto: CollectionMembersDto,
  ) {
    return this.catalog.setMembers(scheme, code, dto);
  }

  @Delete('collections/:code')
  deleteCollection(@SchemeCode() scheme: string, @Param('code') code: string) {
    return this.catalog.deleteCollection(scheme, code);
  }

  @Get('lists')
  listValues(@SchemeCode() scheme: string) {
    return this.catalog.listValues(scheme);
  }

  @Post('lists')
  addListValue(@SchemeCode() scheme: string, @Body() dto: ListValueDto) {
    return this.catalog.addListValue(scheme, dto);
  }

  @Patch('lists/:id')
  updateListValue(
    @SchemeCode() scheme: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateListValueDto,
  ) {
    return this.catalog.updateListValue(scheme, id, dto);
  }

  // ----------------------------------------------------------- custom fields

  @Get('fields')
  fieldList(@SchemeCode() scheme: string) {
    return this.fields.list(scheme);
  }

  @Post('fields')
  createField(@SchemeCode() scheme: string, @Body() dto: CreateFieldDto) {
    return this.fields.create(scheme, dto);
  }

  /** `code` and `type` are not in the DTO: sending them is a 400. */
  @Patch('fields/:id')
  updateField(
    @SchemeCode() scheme: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFieldDto,
  ) {
    return this.fields.update(scheme, id, dto);
  }

  /** Built-in import targets plus `x:<code>` per active custom field. */
  @Get('import-fields')
  importFields(@SchemeCode() scheme: string) {
    return this.fields.importFields(scheme);
  }

  // ------------------------------------------------------------------- usage

  @Get('usage')
  usageSummary(@SchemeCode() scheme: string, @Query('days') days?: string) {
    return this.usage.summary(scheme, days === undefined ? 30 : Number(days));
  }

  /**
   * Calls per connected system (API key → MIS) to the whole Concepts
   * API, next to the anonymous reads of the same period. Under `admin/`, so
   * only the full admin grant reaches it (never a concepts-only one).
   */
  @Get('usage/platforms')
  usageByPlatform(
    @SchemeCode() scheme: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('days') days?: string,
  ) {
    return this.platformUsage.byPlatform(scheme, { from, to, days });
  }

  // ------------------------------------------------------------------ import

  /** Dry run: what the import would do, row by row. Writes nothing. */
  @Post('import/preview')
  importPreview(@SchemeCode() scheme: string, @Body() dto: ImportConceptsDto) {
    return this.importer.preview(scheme, dto.rows);
  }

  /** Writes the same plan in one transaction, all or nothing. */
  @Post('import')
  importRows(
    @SchemeCode() scheme: string,
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

  /**
   * Read-only copies of `GET :scheme/fields` and `GET :scheme/lists` under the
   * concept path: the concept editor needs them, and granting the setup paths
   * to a concepts-only role would also open their POST/PATCH (the permission
   * check matches the path, not the method). GET only, on purpose.
   */
  @Get('concepts-meta/fields')
  conceptsMetaFields(@SchemeCode() scheme: string) {
    return this.fields.list(scheme);
  }

  @Get('concepts-meta/lists')
  conceptsMetaLists(@SchemeCode() scheme: string) {
    return this.catalog.listValues(scheme);
  }

  /** Every concept of the scheme; `q` ranks them with the same text search as the public list. */
  @Get('concepts')
  list(
    @SchemeCode() scheme: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.admin.list(scheme, status, q);
  }

  @Get('concepts/:termId')
  get(
    @SchemeCode() scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
  ) {
    return this.admin.get(scheme, termId);
  }

  @Post('concepts')
  create(
    @SchemeCode() scheme: string,
    @Body() dto: CreateConceptDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.create(scheme, dto, {
      ...this.actor(user),
      action: GcHistoryAction.CREATE,
    });
  }

  @Patch('concepts/:termId')
  update(
    @SchemeCode() scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: UpdateConceptDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.update(scheme, termId, dto, this.actor(user));
  }

  @Patch('concepts/:termId/status')
  setStatus(
    @SchemeCode() scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: ConceptStatusDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.setStatus(scheme, termId, dto, this.actor(user));
  }

  @Put('concepts/:termId/labels')
  setLabels(
    @SchemeCode() scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: ConceptLabelsDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.setLabels(scheme, termId, dto, this.actor(user));
  }

  @Post('concepts/:termId/relations')
  addRelation(
    @SchemeCode() scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: RelationDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.addRelation(scheme, termId, dto, this.actor(user));
  }

  /** POST and not DELETE: the relation is identified by a body (kind + target). */
  @Post('concepts/:termId/relations/remove')
  removeRelation(
    @SchemeCode() scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: RelationDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.removeRelation(scheme, termId, dto, this.actor(user));
  }

  @Post('concepts/:termId/mappings')
  upsertMapping(
    @SchemeCode() scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: MappingDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.upsertMapping(scheme, termId, dto, this.actor(user));
  }

  @Delete('concepts/:termId/mappings/:mappingId')
  removeMapping(
    @SchemeCode() scheme: string,
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

  @Get('concepts/:termId/icons')
  iconList(
    @SchemeCode() scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
  ) {
    return this.icons.list(scheme, termId);
  }

  @Post('concepts/:termId/icons')
  createIcon(
    @SchemeCode() scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: IconDto,
    @GetUserData() user: UserData,
  ) {
    return this.icons.create(scheme, termId, dto, this.actor(user));
  }

  /**
   * Same as `PATCH :scheme/icons/:id`, under the concept path so the
   * concepts-only permission (`.../admin/meliaf-taxonomy/concepts`) reaches it. The
   * icon must belong to `termId` (404 otherwise).
   */
  @Patch('concepts/:termId/icons/:id')
  updateConceptIcon(
    @SchemeCode() scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIconDto,
    @GetUserData() user: UserData,
  ) {
    return this.icons.update(scheme, id, dto, this.actor(user), termId);
  }

  @Delete('concepts/:termId/icons/:id')
  removeConceptIcon(
    @SchemeCode() scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('id', ParseIntPipe) id: number,
    @GetUserData() user: UserData,
  ) {
    return this.icons.remove(scheme, id, this.actor(user), termId);
  }

  @Patch('icons/:id')
  updateIcon(
    @SchemeCode() scheme: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIconDto,
    @GetUserData() user: UserData,
  ) {
    return this.icons.update(scheme, id, dto, this.actor(user));
  }

  @Delete('icons/:id')
  removeIcon(
    @SchemeCode() scheme: string,
    @Param('id', ParseIntPipe) id: number,
    @GetUserData() user: UserData,
  ) {
    return this.icons.remove(scheme, id, this.actor(user));
  }

  @Post('concepts/:termId/merge')
  merge(
    @SchemeCode() scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: MergeDto,
    @GetUserData() user: UserData,
  ) {
    return this.admin.merge(scheme, termId, dto, this.actor(user));
  }

  @Get('requests')
  requestList(@SchemeCode() scheme: string, @Query('state') state?: string) {
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

  @Get('quality')
  quality(@SchemeCode() scheme: string) {
    return this.releases.preview(scheme);
  }

  @Post('releases')
  publish(
    @SchemeCode() scheme: string,
    @Body() dto: PublishReleaseDto,
    @GetUserData() user: UserData,
  ) {
    return this.releases.publish(scheme, dto, user.email);
  }
}
