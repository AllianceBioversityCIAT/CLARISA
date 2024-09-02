import { Module } from '@nestjs/common';
import { OSTCron } from '../ost/ost.cron';
import { OSTApi } from '../ost/ost.api';
import { ApiGeoNames } from '../geonames/geonames.api';
import { WorkpackageRepository } from '../../api/workpackage/repositories/workpackage.repository';
import { InitiativeRepository } from '../../api/initiative/repositories/initiative.repository';
import { CountryRepository } from '../../api/country/repositories/country.repository';
import { RegionRepository } from '../../api/region/repositories/region.repository';
import { QaApi } from '../qa/qa.api';
import { HttpModule } from '@nestjs/axios';
import { InitiativeStageRepository } from '../../api/initiative/repositories/initiative-stage.repository';
import { StageRepository } from '../../api/initiative/repositories/status.repository';
import { WorkpackageCountryRepository } from '../../api/workpackage/repositories/workpackage-country.repository';
import { WorkpackageRegionRepository } from '../../api/workpackage/repositories/workpackage-country.repository copy';
import { TOCCron } from '../toc/toc.cron';
import { TOCApi } from '../toc/toc.api';
import { PhaseRepository } from '../../api/phase/repositories/phase.repository';
import { ReportingCron } from '../reporting/reporting.cron';
import { ReportingApi } from '../reporting/reporting.api';
import { RiskCron } from '../risk/risk.cron';
import { RiskApi } from '../risk/risk.api';
import { CronjobController } from './cronjob.controller';

@Module({
  imports: [HttpModule],
  providers: [
    OSTCron,
    OSTApi,
    ApiGeoNames,
    WorkpackageRepository,
    InitiativeRepository,
    CountryRepository,
    RegionRepository,
    QaApi,
    InitiativeStageRepository,
    StageRepository,
    WorkpackageCountryRepository,
    WorkpackageRegionRepository,
    TOCCron,
    TOCApi,
    PhaseRepository,
    ReportingCron,
    ReportingApi,
    RiskCron,
    RiskApi,
  ],
  controllers: [CronjobController],
})
export class CronjobModule {}
