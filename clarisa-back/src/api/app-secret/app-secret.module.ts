import { Module } from '@nestjs/common';
import { AppSecretService } from './app-secret.service';
import { AppSecretController } from './app-secret.controller';
import { AppSecretMapper } from './mappers/app-secret.mapper';
import { AppSecretRepository } from './repositories/app-secret.repository';
import { MisModule } from '../mis/mis.module';
import { BCryptPasswordEncoder } from '../../auth/utils/BCryptPasswordEncoder';

@Module({
  imports: [MisModule],
  controllers: [AppSecretController],
  providers: [
    AppSecretService,
    AppSecretRepository,
    AppSecretMapper,
    BCryptPasswordEncoder,
  ],
})
export class AppSecretModule {}
