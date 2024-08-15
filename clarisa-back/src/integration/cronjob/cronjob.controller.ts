import {
  Controller,
  Get,
  HttpException,
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

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CronjobController {
  constructor(
    private readonly cronOst: OSTCron,
    private readonly cronToc: TOCCron,
    private readonly cronReporting: ReportingCron,
    private readonly cronRisk: RiskCron,
  ) {}

  @Get('ost/initiatives')
  async updateAllInititatives() {
    this.cronOst.cronInitiativeRelatedData();
  }

  @Get('ost/workpackages')
  async updateAllWorkpackages() {
    this.cronOst.cronWorkpackageRelatedData();
  }

  @Get(':mis/phases')
  async updateAllPhasesFromApplication(@Param('mis') mis: string) {
    const misObject = PRMSApplication.getfromSimpleName(mis);
    switch (misObject) {
      case PRMSApplication.IPSR:
      case PRMSApplication.REPORTING_TOOL:
        this.cronReporting.syncPhasesDataFromApplication(misObject);
        break;
      case PRMSApplication.TOC:
        this.cronToc.cronTocPhasesData();
        break;
      case PRMSApplication.RISK:
        this.cronRisk.cronRiskPhasesData();
        break;
      default:
        throw new HttpException(`Cannot find application ${mis}`, 404);
      //case PRMSApplication.OST:
    }
  }
}
