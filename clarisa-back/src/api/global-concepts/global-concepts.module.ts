import { Module } from '@nestjs/common';
import { GlobalConceptsAdminController } from './controllers/global-concepts-admin.controller';
import { GlobalConceptsPublicController } from './controllers/global-concepts-public.controller';
import { ConceptUriController } from './controllers/concept-uri.controller';
import { ConceptGraphLoader } from './services/concept-graph.loader';
import { ConceptsReadService } from './services/concepts-read.service';
import { ConceptsAdminService } from './services/concepts-admin.service';
import { ConceptsExportService } from './services/concepts-export.service';
import { ReleasesService } from './services/releases.service';
import { GlobalConceptsEnabledGuard } from './utils/feature-enabled.guard';

const providers = [
  ConceptGraphLoader,
  ConceptsReadService,
  ConceptsAdminService,
  ConceptsExportService,
  ReleasesService,
  GlobalConceptsEnabledGuard,
];

/**
 * Global Concepts — the decoupled module that hosts the MELIAF taxonomy
 * (openspec/changes/add-global-concepts). Mounted at `api/global-concepts`.
 * The admin controller is declared first so `admin/...` matches before the
 * public `:scheme/...` routes.
 */
@Module({
  controllers: [GlobalConceptsAdminController, GlobalConceptsPublicController],
  providers,
  exports: providers,
})
export class GlobalConceptsModule {}

/**
 * Persistent URIs (`/concepts/...`), mounted at the root of the API host so
 * the URI stays short and outside the versionable `api/` path.
 */
@Module({
  imports: [GlobalConceptsModule],
  controllers: [ConceptUriController],
})
export class GlobalConceptsUriModule {}
