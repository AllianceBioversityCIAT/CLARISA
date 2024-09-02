import { Module } from '@nestjs/common';
import { QaTokenAuthService } from './qa-token-auth.service';
import { QaTokenAuthController } from './qa-token-auth.controller';
import { QaTokenAuthRepository } from './repositories/qa-token-auth.repository';
import { HttpModule } from '@nestjs/axios';
import { QaApi } from '../../integration/qa/qa.api';

@Module({
  imports: [HttpModule],
  controllers: [QaTokenAuthController],
  providers: [QaTokenAuthService, QaTokenAuthRepository, QaApi],
  exports: [QaTokenAuthService, QaTokenAuthRepository],
})
export class QaTokenAuthModule {}
