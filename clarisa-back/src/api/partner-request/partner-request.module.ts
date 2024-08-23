import { Module } from '@nestjs/common';
import { PartnerRequestService } from './partner-request.service';
import { PartnerRequestController } from './partner-request.controller';
import { PartnerRequestRepository } from './repositories/partner-request.repository';
import { CountryRepository } from '../country/repositories/country.repository';
import { InstitutionRepository } from '../institution/repositories/institution.repository';
import { MailUtil } from 'src/shared/utils/mailer.util';
import { InstitutionTypeRepository } from '../institution-type/repositories/institution-type.repository';
import { MisRepository } from '../mis/repositories/mis.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { InstitutionLocationRepository } from '../institution/repositories/institution-location.repository';
import { OpenSearchModule } from '../../integration/opensearch/open-search.module';
import { OpenSearchApi } from '../../integration/opensearch/open-search.api';

@Module({
  imports: [OpenSearchModule],
  controllers: [PartnerRequestController],
  providers: [
    PartnerRequestService,
    PartnerRequestRepository,
    CountryRepository,
    InstitutionRepository,
    MailUtil,
    InstitutionTypeRepository,
    MisRepository,
    UserRepository,
    InstitutionLocationRepository,
    OpenSearchApi,
  ],
  exports: [
    PartnerRequestService,
    PartnerRequestRepository,
    CountryRepository,
    InstitutionRepository,
    MailUtil,
    InstitutionTypeRepository,
    MisRepository,
    UserRepository,
    InstitutionLocationRepository,
    OpenSearchApi,
  ],
})
export class PartnerRequestModule {}
