import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  HttpException,
  HttpStatus,
  Res,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GlossaryService } from './glossary.service';
import {
  GlossaryExportFormat,
  GlossaryExportService,
} from './glossary-export.service';
import { UpdateGlossaryDto } from './dto/update-glossary.dto';
import { Glossary } from './entities/glossary.entity';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@ApiTags('Glossary')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class GlossaryController {
  constructor(
    private readonly glossaryService: GlossaryService,
    private readonly glossaryExportService: GlossaryExportService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List glossary terms',
    description:
      'Each term includes a "portfolios" array with the CGIAR portfolios ' +
      '(id, name, acronym) the term belongs to. ' +
      "CLARISA Glossary is CGIAR's standardized glossary of terms used in " +
      'performance management, planning, and reporting. It defines the common ' +
      'vocabulary — covering structural concepts (Program, Accelerator, Area of ' +
      'Work, Portfolio), results-framework terms (Output, Outcome, Impact, ' +
      'Impact Area, Indicator, Theory of Change), and scaling/innovation terms ' +
      '(Innovation Package, Scaling Readiness, IPSR) — so that Centers, ' +
      'Programs & Accelerators use consistent definitions when planning work ' +
      'and reporting results. ' +
      'Each term may also carry its provenance: "source" (the document or body ' +
      'the definition comes from), "sourceUrl" (a link to it, when public) and ' +
      '"referenceDate" (the date of that material, as YYYY-MM-DD). The three are ' +
      'null while a definition has not been attributed yet. ' +
      'A term whose meaning changed between portfolios is published once per ' +
      'version, so the same "term" can appear more than once: each entry ' +
      'carries the portfolios its definition applies to, and every entry of ' +
      'the same concept shares a "groupId". Terms that were never versioned ' +
      'return a single entry, as they always have. ' +
      'Last updated September 2026.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  findAll(@Query('show') show: FindAllOptions) {
    return this.glossaryService.findAll(show);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Download the whole glossary as one file',
    description:
      'Every active term in one download, in the format asked for: "json" ' +
      '(default; the same keys as GET api/glossary), "csv" (one row per term, ' +
      'definitions as plain text, UTF-8) or "skos" (Turtle: one skos:Concept ' +
      'per term under a skos:ConceptScheme, with its persistent URI built on ' +
      '"termId", prefLabel, altLabel, definition and provenance). Served as an ' +
      'attachment. Read-only and public, like GET api/glossary.',
  })
  @ApiQuery({
    name: 'format',
    enum: GlossaryExportFormat,
    required: false,
    description: "'json' (default), 'csv' or 'skos'.",
  })
  async export(
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    const wanted = (format ?? GlossaryExportFormat.JSON).toLowerCase();
    if (
      !Object.values(GlossaryExportFormat).includes(
        wanted as GlossaryExportFormat,
      )
    ) {
      throw new HttpException(
        `Unknown export format "${format}". Use json, csv or skos.`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const file = await this.glossaryExportService.export(
      wanted as GlossaryExportFormat,
    );
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    // Nothing is returned on purpose: the controller's ClassSerializerInterceptor
    // would try to serialize the Express response object, which is huge and
    // circular, and that took the whole API down after every download.
    res.status(HttpStatus.OK).send(file.body);
  }

  @Get('/dashboard')
  findAllForDashboard(@Query('show') show: FindAllOptions) {
    return this.glossaryService.findAll(show, true);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.glossaryService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateGlossaryDto: UpdateGlossaryDto[],
  ) {
    try {
      const result: Glossary[] =
        await this.glossaryService.update(updateGlossaryDto);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
