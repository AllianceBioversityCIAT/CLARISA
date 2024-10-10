import { Global, Module } from '@nestjs/common';
import { AppConfig } from './shared/utils/app-config';

/**
 * The GlobalModule class serves as a placeholder for global configurations
 * and services that are shared across the entire application.
 *
 * This module can be used to import and configure providers that need to be
 * available application-wide.
 */
@Global()
@Module({
  providers: [AppConfig],
  exports: [AppConfig],
})
export class GlobalModule {}
