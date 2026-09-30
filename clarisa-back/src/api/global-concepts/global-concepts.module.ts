import { Module } from '@nestjs/common';
import { GuardsModule } from '../../shared/guards/guards.module';
import { ApiKeyModule } from '../api-key/api-key.module';
import { HandlebarsTemplateModule } from '../handlebars-template/handlebars-template.module';
import { HandlebarsCompiler } from '../../shared/utils/handlebars-compiler';
import { MessagingMicroservice } from '../../integration/microservices/messaging/messaging.microservice';
import {
  GlobalConceptsPlatformController,
  GlobalConceptsRequestsController,
} from './controllers/global-concepts-requests.controller';
import { RequestsService } from './services/requests.service';
import { AiService } from './services/ai.service';
import { AiAssistService } from './services/ai-assist.service';
import { ConceptsSuggestService } from './services/concepts-suggest.service';
import { McpService } from './services/mcp.service';
import { ConceptsImportService } from './services/concepts-import.service';
import { ConceptsCatalogService } from './services/concepts-catalog.service';
import { EmbeddingsService } from './services/embeddings.service';
import { GlobalConceptsMcpController } from './controllers/global-concepts-mcp.controller';
import { OutboxService } from './services/outbox.service';
import { GlobalConceptsAdminController } from './controllers/global-concepts-admin.controller';
import { GlobalConceptsAssistantController } from './controllers/global-concepts-assistant.controller';
import { ConceptAssistantService } from './services/concept-assistant.service';
import { GlobalConceptsPublicController } from './controllers/global-concepts-public.controller';
import { ConceptUriController } from './controllers/concept-uri.controller';
import { ConceptGraphLoader } from './services/concept-graph.loader';
import { ConceptsReadService } from './services/concepts-read.service';
import { ConceptsAdminService } from './services/concepts-admin.service';
import { ConceptsExportService } from './services/concepts-export.service';
import { ReleasesService } from './services/releases.service';
import { ConceptsIconsService } from './services/concepts-icons.service';
import { ConceptsFieldsService } from './services/concepts-fields.service';
import { UsageService } from './services/usage.service';
import { PlatformUsageService } from './services/platform-usage.service';
import { OptionalApiKeyUsageInterceptor } from '../../shared/interceptors/optional-api-key-usage.interceptor';
import { GlobalConceptsEnabledGuard } from './utils/feature-enabled.guard';
import { PublicRateLimitGuard } from './utils/public-rate-limit.guard';

const providers = [
  ConceptGraphLoader,
  ConceptsReadService,
  ConceptsAdminService,
  ConceptsExportService,
  ReleasesService,
  RequestsService,
  OutboxService,
  AiService,
  AiAssistService,
  ConceptAssistantService,
  ConceptsSuggestService,
  McpService,
  ConceptsImportService,
  ConceptsCatalogService,
  EmbeddingsService,
  ConceptsIconsService,
  ConceptsFieldsService,
  UsageService,
  PlatformUsageService,
  OptionalApiKeyUsageInterceptor,
  GlobalConceptsEnabledGuard,
  PublicRateLimitGuard,
];

/**
 * Global Concepts — the decoupled module that hosts the MELIAF taxonomy
 * (openspec/changes/add-global-concepts). Mounted at `api/meliaf-taxonomy`.
 * The admin controller is declared first so `admin/...` matches before the
 * public `:scheme/...` routes.
 */
@Module({
  // ApiKeyModule: `@UseGuards(ApiKeyGuard)` builds the guard in THIS module's
  // context, so ApiKeyService must be visible here (GuardsModule's export is not enough).
  imports: [GuardsModule, ApiKeyModule, HandlebarsTemplateModule],
  controllers: [
    GlobalConceptsAdminController,
    GlobalConceptsAssistantController,
    GlobalConceptsPlatformController,
    GlobalConceptsRequestsController,
    GlobalConceptsMcpController,
    GlobalConceptsPublicController,
  ],
  providers: [...providers, MessagingMicroservice, HandlebarsCompiler],
  exports: providers,
})
export class GlobalConceptsModule {}

/**
 * Persistent URIs (`/concepts/...`), mounted at the root of the API host so
 * the URI stays short and outside the versionable `api/` path.
 */
@Module({
  // ApiKeyModule: the controller's `OptionalApiKeyUsageInterceptor` is built
  // in this module's context and needs ApiKeyService / ApiKeyUsageLogService.
  imports: [GlobalConceptsModule, ApiKeyModule],
  controllers: [ConceptUriController],
})
export class GlobalConceptsUriModule {}
