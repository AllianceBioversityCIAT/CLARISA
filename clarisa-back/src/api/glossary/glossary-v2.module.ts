import { Module } from '@nestjs/common';
import { GlossaryV2Controller } from './glossary-v2.controller';
import { GlossaryService } from './glossary.service';
import { GlossaryRepository } from './repositories/glossary.repository';

/**
 * Mounted at `api/v2/glossary` (see `api.routes.ts`). It is a separate
 * module only because the router maps one path to one module: the service
 * and the repository are the same ones v1 uses, so v1 and v2 read the same
 * rows the same way.
 */
@Module({
  controllers: [GlossaryV2Controller],
  providers: [GlossaryService, GlossaryRepository],
})
export class GlossaryV2Module {}
