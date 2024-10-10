import { Module } from '@nestjs/common';
import { PartnerRequestService } from './partner-request.service';
import { PartnerRequestController } from './partner-request.controller';
import { PartnerRequestRepository } from './repositories/partner-request.repository';
import { CountryRepository } from '../country/repositories/country.repository';
import { InstitutionRepository } from '../institution/repositories/institution.repository';
import { InstitutionTypeRepository } from '../institution-type/repositories/institution-type.repository';
import { MisRepository } from '../mis/repositories/mis.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { InstitutionLocationRepository } from '../institution/repositories/institution-location.repository';
import { OpenSearchModule } from '../../integration/opensearch/open-search.module';
import { HttpModule } from '@nestjs/axios';
import { OpenSearchInstitutionApi } from '../../integration/opensearch/institution/open-search-institution.api';
import { MessagingMicroservice } from '../../integration/microservices/messaging/messaging.microservice';
import { HandlebarsTemplateModule } from '../handlebars-template/handlebars-template.module';
import { HandlebarsCompiler } from '../../shared/utils/handlebars-compiler';

@Module({
  imports: [OpenSearchModule, HttpModule, HandlebarsTemplateModule],
  controllers: [PartnerRequestController],
  providers: [
    PartnerRequestService,
    PartnerRequestRepository,
    CountryRepository,
    InstitutionRepository,
    InstitutionTypeRepository,
    MisRepository,
    UserRepository,
    InstitutionLocationRepository,
    OpenSearchInstitutionApi,
    MessagingMicroservice,
    HandlebarsCompiler,
  ],
  exports: [
    PartnerRequestService,
    PartnerRequestRepository,
    CountryRepository,
    InstitutionRepository,
    InstitutionTypeRepository,
    MisRepository,
    UserRepository,
    InstitutionLocationRepository,
    OpenSearchInstitutionApi,
    MessagingMicroservice,
    HandlebarsCompiler,
  ],
})
export class PartnerRequestModule {}
