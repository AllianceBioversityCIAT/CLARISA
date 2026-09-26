import {
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { GlobalConceptsEnabledGuard } from '../utils/feature-enabled.guard';
import { ConceptsReadService } from '../services/concepts-read.service';
import {
  ConceptExportFormat,
  ConceptsExportService,
} from '../services/concepts-export.service';
import { ConceptGraphLoader } from '../services/concept-graph.loader';
import { DataSource } from 'typeorm';
import { GlobalConceptsConfig } from '../global-concepts.config';

/**
 * Resolves persistent URIs: `/concepts/{scheme}/{term_id}` and
 * `/concepts/{scheme}` (Audit correction 1). The front (S3 + CloudFront)
 * cannot negotiate content, so the API host does:
 *
 * - `Accept: text/turtle` or `application/ld+json` (or `?format=skos|jsonld|json`)
 *   → the resource as data, with `Vary: Accept`;
 * - anything else (a browser) → 303 to the human page on the CLARISA site.
 *
 * Deprecated concepts keep resolving and carry their replacement (V8).
 */
@ApiExcludeController()
@Controller()
@UseGuards(GlobalConceptsEnabledGuard)
export class ConceptUriController {
  constructor(
    private readonly read: ConceptsReadService,
    private readonly exporter: ConceptsExportService,
    private readonly loader: ConceptGraphLoader,
    private readonly dataSource: DataSource,
  ) {}

  @Get(':scheme/:termId')
  async concept(
    @Param('scheme') scheme: string,
    @Param('termId', ParseIntPipe) termId: number,
    @Res() res: Response,
    @Headers('accept') accept = '',
    @Query('format') format?: string,
  ) {
    const wanted = this.negotiate(accept, format);
    res.setHeader('Vary', 'Accept');
    if (!wanted) {
      const concept = await this.read.get(scheme, termId); // 404 when not public
      return res.redirect(
        303,
        `${GlobalConceptsConfig.webBase}/${concept.scheme}/${concept.term_id}`,
      );
    }
    const concept = await this.read.get(scheme, termId);
    const schemeRow = await this.loader.scheme(this.dataSource.manager, scheme);
    const file = this.exporter.render(schemeRow, [concept], wanted);
    res.setHeader('Content-Type', file.contentType);
    return res.status(200).send(file.body);
  }

  @Get(':scheme')
  async scheme(
    @Param('scheme') scheme: string,
    @Res() res: Response,
    @Headers('accept') accept = '',
    @Query('format') format?: string,
  ) {
    const wanted = this.negotiate(accept, format);
    res.setHeader('Vary', 'Accept');
    if (!wanted) {
      const meta = await this.read.scheme(scheme);
      return res.redirect(303, `${GlobalConceptsConfig.webBase}/${meta.code}`);
    }
    const file = await this.exporter.export(scheme, wanted);
    res.setHeader('Content-Type', file.contentType);
    return res.status(200).send(file.body);
  }

  /** `?format=` wins; otherwise the Accept header; `null` means "a person". */
  private negotiate(
    accept: string,
    format?: string,
  ): ConceptExportFormat | null {
    const f = (format ?? '').toLowerCase();
    if (f === 'skos' || f === 'turtle' || f === 'ttl') return 'skos';
    if (f === 'jsonld') return 'jsonld';
    if (f === 'json') return 'json';
    const a = (accept ?? '').toLowerCase();
    if (a.includes('text/turtle')) return 'skos';
    if (a.includes('application/ld+json')) return 'jsonld';
    if (a.includes('application/json') && !a.includes('text/html'))
      return 'json';
    return null;
  }
}
