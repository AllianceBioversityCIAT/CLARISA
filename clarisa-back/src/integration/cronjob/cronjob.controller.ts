import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { OSTCron } from '../ost/ost.cron';
import { TOCCron } from '../toc/toc.cron';
import { ReportingCron } from '../reporting/reporting.cron';
import { RiskCron } from '../risk/risk.cron';
import { PRMSApplication } from '../../shared/entities/enums/prms-applications';
import { Immutable } from '../../shared/utils/deep-immutable';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CronjobController {
  constructor(
    private readonly cronOst: Immutable<OSTCron>,
    private readonly cronToc: Immutable<TOCCron>,
    private readonly cronReporting: Immutable<ReportingCron>,
    private readonly cronRisk: Immutable<RiskCron>,
  ) {}

  @Get('ost/initiatives')
  async updateAllInititatives(): Promise<void> {
    return this.cronOst.cronInitiativeRelatedData();
  }

  @Get('ost/workpackages')
  async updateAllWorkpackages(): Promise<void> {
    return this.cronOst.cronWorkpackageRelatedData();
  }

  @Get(':mis/phases')
  async updateAllPhasesFromApplication(
    @Param('mis') mis: string,
  ): Promise<void> {
    const misObject = PRMSApplication.getfromSimpleName(mis);
    switch (misObject) {
      case PRMSApplication.IPSR:
      case PRMSApplication.REPORTING_TOOL:
        return this.cronReporting.syncPhasesDataFromApplication(misObject);
      case PRMSApplication.TOC:
        return this.cronToc.cronTocPhasesData();
      case PRMSApplication.RISK:
        return this.cronRisk.cronRiskPhasesData();
      default:
        throw new HttpException(
          `Cannot find application ${mis}`,
          HttpStatus.NOT_FOUND,
        );
      //case PRMSApplication.OST:
    }
  }
}
