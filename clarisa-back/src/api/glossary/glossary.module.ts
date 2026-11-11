import { Module } from '@nestjs/common';
import { GlossaryService } from './glossary.service';
import { GlossaryExportService } from './glossary-export.service';
import { GlossaryController } from './glossary.controller';
import { GLOSSARY_STORAGE, GlossaryStore } from './glossary-store';
import { GlossaryAdminService } from './glossary-admin.service';
import { GlossaryAdminController } from './glossary-admin.controller';

@Module({
  // The admin controller is declared first so `api/glossary/admin/...` is
  // matched before the public `get/:id` style routes.
  controllers: [GlossaryAdminController, GlossaryController],
  providers: [
    GlossaryService,
    GlossaryExportService,
    GlossaryAdminService,
    // The glossary's only store: the `glossary` collection of the taxonomy.
    { provide: GLOSSARY_STORAGE, useClass: GlossaryStore },
  ],
})
export class GlossaryModule {}
