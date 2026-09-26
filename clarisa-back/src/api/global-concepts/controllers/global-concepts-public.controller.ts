import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GlobalConceptsEnabledGuard } from '../utils/feature-enabled.guard';
import { ConceptsReadService } from '../services/concepts-read.service';
import {
  ConceptExportFormat,
  ConceptsExportService,
} from '../services/concepts-export.service';

/**
 * Public, anonymous read of Global Concepts. Only approved and deprecated
 * concepts exist here; drafts and concepts under review never do.
 */
@ApiTags('Global Concepts')
@Controller()
@UseGuards(GlobalConceptsEnabledGuard)
export class GlobalConceptsPublicController {
  constructor(
    private readonly read: ConceptsReadService,
    private readonly exporter: ConceptsExportService,
  ) {}

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
      '`q` searches preferred, alternative and hidden labels and definitions (partial words). ' +
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
  list(
    @Param('scheme') scheme: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('meliaf_function') meliaf_function?: string,
    @Query('meliaf_phase') meliaf_phase?: string,
    @Query('term_type') term_type?: string,
    @Query('collection') collection?: string,
    @Query('version') version?: string,
  ) {
    return this.read.list(scheme, {
      q,
      status,
      meliaf_function,
      meliaf_phase,
      term_type,
      collection,
      version,
    });
  }

  @Get(':scheme/concepts/:termId')
  @ApiOperation({
    summary:
      'One published concept (JSON). Its persistent URI also answers Turtle / JSON-LD.',
  })
  @ApiQuery({ name: 'version', required: false })
  get(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Query('version') version?: string,
  ) {
    return this.read.get(scheme, termId, version);
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
    const file = await this.exporter.export(
      scheme,
      this.format(format),
      version,
    );
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
