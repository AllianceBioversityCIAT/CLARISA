import { Module } from '@nestjs/common';
import { OpenSearchController } from './open-search.controller';
import { HttpModule } from '@nestjs/axios';
import { OpenSearchApi } from './open-search.api';
import { InstitutionRepository } from '../../api/institution/repositories/institution.repository';
import { InstitutionLocationRepository } from '../../api/institution/repositories/institution-location.repository';

@Module({
  imports: [HttpModule],
  providers: [
    OpenSearchApi,
    InstitutionRepository,
    InstitutionLocationRepository,
  ],
  controllers: [OpenSearchController],
})
export class OpenSearchModule {}
