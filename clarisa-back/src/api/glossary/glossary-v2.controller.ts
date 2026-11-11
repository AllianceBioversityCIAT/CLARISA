import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { instanceToPlain } from 'class-transformer';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { GlossaryService } from './glossary.service';
import { GlossaryTaxonomyLinksService } from './glossary-taxonomy-links.service';

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
 * v2 answers what `GET api/glossary` answers (same service, same serializer,
 * same keys, same order) plus what the taxonomy knows about each term:
 * `termUri` (its persistent URI) and `taxonomyStatus`, both null when the
 * term has no public concept yet. v1, which PRMS and others consume, never
 * sees these fields.
 */
@ApiTags('Glossary')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class GlossaryV2Controller {
  constructor(
    private readonly glossaryService: GlossaryService,
    private readonly taxonomyLinks: GlossaryTaxonomyLinksService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List glossary terms (v2)',
    description:
      'Version 2 of the glossary, versioned in the URL path: api/glossary ' +
      'keeps serving v1 unchanged and api/v2/glossary is where the glossary ' +
      'grows from now on. v2 answers the same terms and keys as v1, plus ' +
      '"termUri" (the persistent URI of the term) and "taxonomyStatus" (the ' +
      'status of the term in the taxonomy: "approved" or "deprecated"), both ' +
      'null when the term has no public concept. ' +
      'Each term carries "term", "definition", "termId" (its permanent ' +
      'identifier), "groupId" (shared by every entry of the same concept: a ' +
      'term whose meaning changed between portfolios is published once per ' +
      'version), "alternativeLabels" (other names readers use for it; an ' +
      'empty list when there are none), "editorialStatus" ("approved" or ' +
      '"deprecated"), "replacedByTermId" (the "termId" of the term that ' +
      'replaces it, or null), a "portfolios" array with the CGIAR portfolios ' +
      '(id, name, acronym) the term belongs to, and its provenance: ' +
      '"source", "sourceUrl" and "referenceDate" (YYYY-MM-DD), null while a ' +
      'definition has not been attributed yet. ' +
      'Drafts and terms under review are never listed.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      "Filter by status: 'all', 'active' (default) or 'inactive'. Any other " +
      'value (empty, repeated or in another case) answers 400. Drafts and ' +
      'terms under review never appear, whatever the value.',
  })
  async findAll(@Query('show') show: FindAllOptions) {
    const terms = await this.glossaryService.findAll(show);
    const links = await this.taxonomyLinks.linksForOrEmpty(
      terms.map((term) => Number(term.id)),
    );
    // Serialised exactly as v1 (same class-transformer defaults the
    // interceptor applies), then the taxonomy keys appended at the end.
    return terms.map((term) => {
      const link = links.get(Number(term.id));
      return {
        ...instanceToPlain(term),
        termUri: link?.termUri ?? null,
        taxonomyStatus: link?.taxonomyStatus ?? null,
      };
    });
  }
}
