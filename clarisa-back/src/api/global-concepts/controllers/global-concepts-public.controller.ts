import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GlobalConceptsEnabledGuard } from '../utils/feature-enabled.guard';
import { ConceptsReadService } from '../services/concepts-read.service';
import { ConceptsSuggestService } from '../services/concepts-suggest.service';
import { PublicRateLimitGuard } from '../utils/public-rate-limit.guard';
import {
  ConceptExportFormat,
  ConceptsExportService,
} from '../services/concepts-export.service';
import { UsageService } from '../services/usage.service';
import { GcUsageKind } from '../entities/gc-usage-daily.entity';
import { OptionalApiKeyUsageInterceptor } from '../../../shared/interceptors/optional-api-key-usage.interceptor';

/**
 * Public, anonymous read of Global Concepts. Only approved and deprecated
 * concepts exist here; drafts and concepts under review never do.
 *
 * Usage is counted here, after a successful answer and without waiting for
 * it (`UsageService.record` is fire-and-forget), so a counter can never fail
 * or slow a read. Services stay uncounted: the MCP tools and the text
 * matcher call them too.
 *
 * Still public, but a platform that sends its CLARISA `X-API-Key` is counted
 * per system (`OptionalApiKeyUsageInterceptor`); a bad key never blocks a read.
 */
@ApiTags('Concepts')
@ApiHeader({
  name: 'X-API-Key',
  required: false,
  description:
    'Optional. Your CLARISA API key: the read stays open without it, and with it your platform is counted in the usage figures. ' +
    'A key that is unknown, revoked or expired never blocks the read; the answer then carries `X-Api-Key-Status: invalid`.',
})
@Controller()
@UseGuards(GlobalConceptsEnabledGuard)
@UseInterceptors(OptionalApiKeyUsageInterceptor)
export class GlobalConceptsPublicController {
  constructor(
    private readonly read: ConceptsReadService,
    private readonly exporter: ConceptsExportService,
    private readonly suggester: ConceptsSuggestService,
    private readonly usage: UsageService,
  ) {}

  @Post(':scheme/suggest')
  @HttpCode(200)
  @UseGuards(PublicRateLimitGuard)
  @ApiOperation({
    summary: 'Find the official concepts a text mentions',
    description:
      'Body `{ "text": "…" }` (up to 20 000 characters). Matches preferred, alternative and hidden ' +
      'labels and acronyms as whole words. The text is never stored, and it travels in the body, ' +
      'never in the URL, because request logs keep URLs.',
  })
  async suggest(
    @Param('scheme') scheme: string,
    @Body() body: { text?: unknown },
  ) {
    const answer = await this.suggester.suggest(scheme, body?.text as string);
    // Counted under a fixed item: the text itself is never stored (V24).
    this.usage.record(scheme, GcUsageKind.SUGGEST, 'text');
    return answer;
  }

  @Get('schemes')
  @ApiOperation({
    summary: 'List concept schemes (MELIAF and any domain or platform scheme)',
  })
  schemes() {
    return this.read.schemes();
  }

  @Get('lists')
  @ApiOperation({
    summary:
      'Controlled lists (status, function, phase, term type, derivation, language…)',
  })
  @ApiQuery({ name: 'scheme', required: false })
  lists(@Query('scheme') scheme?: string) {
    return this.read.lists(scheme);
  }

  @Get(':scheme/fields')
  @ApiOperation({
    summary: 'Custom metadata fields of a scheme (active and public)',
    description:
      'Each concept carries their values in `custom_fields`, in this order. ' +
      '`term_link` values are other concepts of the same scheme.',
  })
  fields(@Param('scheme') scheme: string) {
    return this.read.fields(scheme);
  }

  @Get(':scheme')
  @ApiOperation({
    summary: 'Scheme metadata: title, license, publisher, governance',
  })
  scheme(@Param('scheme') scheme: string) {
    return this.read.scheme(scheme);
  }

  @Get(':scheme/concepts')
  @ApiOperation({
    summary: 'List or search the published concepts of a scheme',
    description:
      '`q` searches the TERM ID, preferred, alternative and hidden labels, short definition and definition, in three tiers: ' +
      'the exact phrase (last word may be partial), then every word in any order, then similar spelling (typos). ' +
      'Each hit carries `match` {tier, score, highlights} with the character ranges to mark. ' +
      'Filters: status (approved|deprecated), meliaf_function, meliaf_phase, term_type, collection. ' +
      '`version` pins the answer to a published release.',
  })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'meliaf_function', required: false })
  @ApiQuery({ name: 'meliaf_phase', required: false })
  @ApiQuery({ name: 'term_type', required: false })
  @ApiQuery({ name: 'collection', required: false })
  @ApiQuery({ name: 'version', required: false })
  @ApiQuery({
    name: 'track',
    required: false,
    description:
      '`0` = do not count this read in usage analytics (search-as-you-type sends it, then one counted request when the query settles).',
  })
  async list(
    @Param('scheme') scheme: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('meliaf_function') meliaf_function?: string,
    @Query('meliaf_phase') meliaf_phase?: string,
    @Query('term_type') term_type?: string,
    @Query('collection') collection?: string,
    @Query('version') version?: string,
    @Query('track') track?: string,
  ) {
    const rows = await this.read.list(scheme, {
      q,
      status,
      meliaf_function,
      meliaf_phase,
      term_type,
      collection,
      version,
    });
    if (track !== '0') this.usage.recordList(scheme, q, rows.length);
    return rows;
  }

  @Get(':scheme/concepts/:termId')
  @ApiOperation({
    summary:
      'One published concept (JSON). Its persistent URI also answers Turtle / JSON-LD.',
  })
  @ApiQuery({ name: 'version', required: false })
  async get(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Query('version') version?: string,
  ) {
    const concept = await this.read.get(scheme, termId, version);
    this.usage.record(scheme, GcUsageKind.VIEW, concept.term_id);
    return concept;
  }

  @Get(':scheme/concepts/:termId/history')
  @ApiOperation({
    summary: 'Public change log of a concept (what and when, never who)',
  })
  history(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
  ) {
    return this.read.history(scheme, termId);
  }

  @Get(':scheme/changes')
  @ApiOperation({
    summary:
      'Changes after a cursor, for incremental sync (use next_cursor as the next since)',
  })
  @ApiQuery({ name: 'since', required: false })
  @ApiQuery({ name: 'limit', required: false })
  changes(
    @Param('scheme') scheme: string,
    @Query('since', new DefaultValuePipe(0), ParseIntPipe) since: number,
    @Query('limit', new DefaultValuePipe(500), ParseIntPipe) limit: number,
  ) {
    return this.read.changes(scheme, since, limit);
  }

  @Get(':scheme/releases')
  @ApiOperation({ summary: 'Published releases of a scheme' })
  releaseList(@Param('scheme') scheme: string) {
    return this.read.releases(scheme);
  }

  @Get(':scheme/export')
  @ApiOperation({
    summary: 'Download the scheme as json, csv, skos (Turtle) or jsonld',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['json', 'csv', 'skos', 'jsonld'],
  })
  @ApiQuery({ name: 'version', required: false })
  async export(
    @Param('scheme') scheme: string,
    @Res() res: Response,
    @Query('format') format = 'json',
    @Query('version') version?: string,
  ) {
    const wanted = this.format(format);
    const file = await this.exporter.export(scheme, wanted, version);
    this.usage.record(scheme, GcUsageKind.EXPORT, wanted);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    return res.status(200).send(file.body);
  }

  private format(raw: string): ConceptExportFormat {
    const f = (raw ?? 'json').toLowerCase();
    if (!['json', 'csv', 'skos', 'jsonld'].includes(f)) {
      throw new BadRequestException(
        `Unknown format "${raw}". Use json, csv, skos or jsonld.`,
      );
    }
    return f as ConceptExportFormat;
  }
}
