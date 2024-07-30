import { Module } from '@nestjs/common';
import { MisService } from './mis.service';
import { MisController } from './mis.controller';
import { MisRepository } from './repositories/mis.repository';
import { EnvironmentModule } from '../environment/environment.module';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
import { MisMapper } from './mappers/mis.mapper';
import { BasicDtoMapper } from '../../shared/mappers/basic-dto.mapper';

@Module({
  imports: [EnvironmentModule, UserModule],
  controllers: [MisController],
  providers: [
    MisService,
    MisRepository,
    MisMapper,
    UserService,
    BasicDtoMapper,
  ],
  exports: [MisService, MisMapper],
})
export class MisModule {}
