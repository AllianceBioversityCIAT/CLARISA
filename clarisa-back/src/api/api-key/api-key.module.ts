import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { ApiKeyUsageLogRepository } from './repositories/api-key-usage-log.repository';
import { ApiKeyMapper } from './mappers/api-key.mapper';
import { ApiKeyUsageLogService } from './api-key-usage-log.service';
import { MisModule } from '../mis/mis.module';
import { EnvironmentModule } from '../environment/environment.module';
import { BCryptPasswordEncoder } from '../../auth/utils/BCryptPasswordEncoder';
import { AppConfig } from '../../shared/utils/app-config';
import { IsKnownApiKeyScopeConstraint } from './validators/is-known-api-key-scope.validator';

@Module({
  imports: [MisModule, EnvironmentModule],
  controllers: [ApiKeyController],
  providers: [
    ApiKeyService,
    ApiKeyRepository,
    ApiKeyUsageLogRepository,
    ApiKeyUsageLogService,
    ApiKeyMapper,
    BCryptPasswordEncoder,
    AppConfig,
    IsKnownApiKeyScopeConstraint,
  ],
  exports: [ApiKeyService, ApiKeyRepository, ApiKeyUsageLogService],
})
export class ApiKeyModule {}
