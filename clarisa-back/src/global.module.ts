import { Global, Module } from '@nestjs/common';
import { AppConfig } from './shared/utils/app-config';

@Global()
@Module({
  providers: [AppConfig],
  exports: [AppConfig],
})
export class GlobalModule {}
