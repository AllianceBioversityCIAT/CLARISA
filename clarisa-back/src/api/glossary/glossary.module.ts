import { Module } from '@nestjs/common';
import { GlossaryService } from './glossary.service';
import { GlossaryController } from './glossary.controller';
import { GlossaryRepository } from './repositories/glossary.repository';
import { GlossaryAdminService } from './glossary-admin.service';
import { GlossaryAdminController } from './glossary-admin.controller';
import { GlossaryPortfolioRepository } from './repositories/glossary-portfolio.repository';

@Module({
  // The admin controller is declared first so `api/glossary/admin/...` is
  // matched before the public `get/:id` style routes.
  controllers: [GlossaryAdminController, GlossaryController],
  providers: [
    GlossaryService,
    GlossaryRepository,
    GlossaryAdminService,
    GlossaryPortfolioRepository,
  ],
})
export class GlossaryModule {}
