import { Module } from '@nestjs/common';
import { GlossaryV2Controller } from './glossary-v2.controller';
import { GlossaryService } from './glossary.service';
import { GlossaryTaxonomyLinksService } from './glossary-taxonomy-links.service';
import { GlossaryRepository } from './repositories/glossary.repository';

/**
 * Mounted at `api/v2/glossary` (see `api.routes.ts`). It is a separate
 * module only because the router maps one path to one module: the service
 * and the repository are the same ones v1 uses, so v1 and v2 read the same
 * rows the same way. `GlossaryTaxonomyLinksService` only reads the taxonomy
 * copy to add `termUri` / `taxonomyStatus`.
 */
@Module({
  controllers: [GlossaryV2Controller],
  providers: [
    GlossaryService,
    GlossaryRepository,
    GlossaryTaxonomyLinksService,
  ],
})
export class GlossaryV2Module {}
