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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GlobalParameterCron } from './global-parameters/global-parameter.cron';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiTags('CronJobs')
export class CronjobController {
  constructor(
    private readonly _cronOst: OSTCron,
    private readonly _cronToc: TOCCron,
    private readonly _cronReporting: ReportingCron,
    private readonly _cronRisk: RiskCron,
    private readonly _cronGlobalParam: GlobalParameterCron,
  ) {}

  @Get('ost/initiatives')
  @ApiOperation({
    summary: 'Update all initiatives data from OST',
  })
  @ApiBearerAuth()
  async updateAllInititatives() {
    this._cronOst.cronInitiativeRelatedData();
  }

  @Get('global-parameters/refresh')
  @ApiOperation({
    summary: 'Update all global parameters cache',
  })
  @ApiBearerAuth()
  async refreshGlobalParametersCache() {
    this._cronGlobalParam.cronRefreshGlobalParametersCache();
  }

  @Get('ost/workpackages')
  @ApiOperation({
    summary: 'Update all workpackages data from OST',
  })
  @ApiBearerAuth()
  async updateAllWorkpackages() {
    this._cronOst.cronWorkpackageRelatedData();
  }

  @Get(':mis/phases')
  @ApiQuery({
    name: 'mis',
    enum: PRMSApplication.getAsEnumLikeObject(),
    required: true,
    description: 'The MIS to update phases data from',
  })
  @ApiOperation({
    summary: 'Update all phases data from a specific application',
  })
  @ApiBearerAuth()
  async updateAllPhasesFromApplication(@Param('mis') mis: string) {
    const misObject = PRMSApplication.getfromSimpleName(mis);
    switch (misObject) {
      case PRMSApplication.IPSR:
      case PRMSApplication.REPORTING_TOOL:
        this._cronReporting.syncPhasesDataFromApplication(misObject);
        break;
      case PRMSApplication.TOC:
        this._cronToc.cronTocPhasesData();
        break;
      case PRMSApplication.RISK:
        this._cronRisk.cronRiskPhasesData();
        break;
      default:
        throw new HttpException(`Cannot find application ${mis}`, 404);
      //case PRMSApplication.OST:
    }
  }
}
