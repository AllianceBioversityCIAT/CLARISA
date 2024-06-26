import {
  Controller,
  Get,
  UseGuards,
  Param,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { CronOST } from './ost/cron.ost';
import { CronTOC } from './toc/cron.toc';
import { PRMSApplication } from '../entities/enums/prms-applications';
import { CronReporting } from './reporting/cron.reporting';
import { CronRisk } from './risk/cron.risk';

@Controller('cronjobs')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class IntegrationController {
  constructor(
    private readonly cronOst: CronOST,
    private readonly cronToc: CronTOC,
    private readonly cronReporting: CronReporting,
    private readonly cronRisk: CronRisk,
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
