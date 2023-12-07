import { Module } from '@nestjs/common';
import { QaTokenAuthService } from './qa-token-auth.service';
import { QaTokenAuthController } from './qa-token-auth.controller';
import { QaTokenAuthRepository } from './repositories/qa-token-auth.repository';
import { QaService } from '../../shared/integration/qa/qa.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [QaTokenAuthController],
  providers: [QaTokenAuthService, QaTokenAuthRepository, QaService],
  exports: [QaTokenAuthService, QaTokenAuthRepository],
})
export class QaTokenAuthModule {}
