import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { InstitutionRepository } from '../../../api/institution/repositories/institution.repository';
import { InstitutionLocationRepository } from '../../../api/institution/repositories/institution-location.repository';
import { OpenSearchInstitutionController } from './open-search-institution.controller';
import { OpenSearchInstitutionApi } from './open-search-institution.api';

@Module({
  imports: [HttpModule],
  providers: [
    OpenSearchInstitutionApi,
    InstitutionRepository,
    InstitutionLocationRepository,
  ],
  controllers: [OpenSearchInstitutionController],
  exports: [OpenSearchInstitutionApi],
})
export class OpenSearchInstitutionModule {}
