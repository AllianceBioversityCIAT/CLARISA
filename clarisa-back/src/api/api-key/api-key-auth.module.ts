import { Module } from '@nestjs/common';
import { ApiKeyModule } from './api-key.module';
import { ApiKeyValidateController } from './api-key-validate.controller';
import { ApiKeyValidateRateLimitGuard } from './guards/api-key-validate-rate-limit.guard';

@Module({
  imports: [ApiKeyModule],
  controllers: [ApiKeyValidateController],
  providers: [ApiKeyValidateRateLimitGuard],
})
export class ApiKeyAuthModule {}
