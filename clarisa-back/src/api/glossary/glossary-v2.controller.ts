import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { GlossaryService } from './glossary.service';

/**
 * `GET api/v2/glossary` — the glossary versioned in the URL path.
 *
 * CLARISA has versioned its API through the optional `?version=N` query
 * param so far (`main.ts`, `VersioningType.CUSTOM`). From the glossary on,
 * new versions carry the version in the path, the way the industry does it
 * (`api/v2/...`); the query-param endpoints stay as they are and migrate
 * one by one later (Yeck, 2026-10-29). This is a plain route, not a
 * `@Version` decorator, so the global mechanism is untouched.
 *
 * Today v2 answers exactly what `GET api/glossary` answers: same service,
 * same serializer, same keys. It is the door the taxonomy fields will come
 * through without moving v1, which PRMS and others consume.
 */
@ApiTags('Glossary')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class GlossaryV2Controller {
  constructor(private readonly glossaryService: GlossaryService) {}

  @Get()
  @ApiOperation({
    summary: 'List glossary terms (v2)',
    description:
      'Version 2 of the glossary, versioned in the URL path: api/glossary ' +
      'keeps serving v1 unchanged and api/v2/glossary is where the glossary ' +
      'grows from now on. Today both answer the same terms with the same ' +
      'keys. ' +
      'Each term includes a "portfolios" array with the CGIAR portfolios ' +
      '(id, name, acronym) the term belongs to, and may carry its ' +
      'provenance: "source", "sourceUrl" and "referenceDate" (YYYY-MM-DD), ' +
      'null while a definition has not been attributed yet.',
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
}
