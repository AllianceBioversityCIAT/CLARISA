import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { ApiKeyUsageLogRepository } from './repositories/api-key-usage-log.repository';
import { ApiKeyMapper } from './mappers/api-key.mapper';
import { MisModule } from '../mis/mis.module';
import { EnvironmentModule } from '../environment/environment.module';
import { BCryptPasswordEncoder } from '../../auth/utils/BCryptPasswordEncoder';
import { AppConfig } from '../../shared/utils/app-config';

@Module({
  imports: [MisModule, EnvironmentModule],
  controllers: [ApiKeyController],
  providers: [
    ApiKeyService,
    ApiKeyRepository,
    ApiKeyUsageLogRepository,
    ApiKeyMapper,
    BCryptPasswordEncoder,
    AppConfig,
  ],
  exports: [ApiKeyService, ApiKeyRepository],
})
export class ApiKeyModule {}
