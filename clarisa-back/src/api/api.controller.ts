import {
  Controller,
  Get,
  HttpStatus,
  Redirect,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { GetUserData } from '../shared/decorators/user-data.decorator';
import { ResponseDto } from '../shared/entities/dtos/response.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../shared/guards/permission.guard';
import { UserData } from '../shared/interfaces/user-data';
import { ApiService } from './api.service';
import { CountryOfficeRequestService } from './country-office-request/country-office-request.service';
import { CountryOfficeRequestDto } from './country-office-request/dto/country-office-request.dto';
import { CreateCountryOfficeRequestDto } from './country-office-request/dto/create-country-office-request.dto';
import { CreatePartnerRequestDto } from './partner-request/dto/create-partner-request.dto';
import { PartnerRequestDto } from './partner-request/dto/partner-request.dto';
import { PartnerRequestService } from './partner-request/partner-request.service';
import { QaTokenAuthService } from '../auth/qa-token-auth/qa-token-auth.service';
import { CreateQaTokenAuthDto } from '../auth/qa-token-auth/dto/create-qa-token-auth.dto';

@Controller()
export class ApiController {
  constructor(
    private _partnerRequestService: PartnerRequestService,
    private _countryOfficeRequestService: CountryOfficeRequestService,
    private qaTokenAuthService: QaTokenAuthService,
    private readonly _apiService: ApiService,
  ) {}

  @Get()
  findAll() {
    return this._apiService.findAll();
  }

  /*
    NOTE: the following exposed endpoints have been added in order
    to mantain compatibility with systems that have not changed
    to the new endpoints
  */

  @Get('un-regions')
  @Redirect('regions/un-regions', HttpStatus.MOVED_PERMANENTLY)
  getUNRegions() {
    // nothing, we are just going to redirect
  }

  @Get('OneCGIARRegions')
  @Redirect('regions/one-cgiar-regions', HttpStatus.MOVED_PERMANENTLY)
  getOneCGIARRegions() {
    // nothing, we are just going to redirect
  }

  @Get('institutionsSimpleRelated')
  @Redirect('institution-dictionary', HttpStatus.MOVED_PERMANENTLY)
  getInstitutionDictionary() {
    // nothing, we are just going to redirect
  }

  @Get('allSDG')
  @Redirect('sdgs/legacy', HttpStatus.MOVED_PERMANENTLY)
  getSDGs() {
    // nothing, we are just going to redirect
  }

  @Get('allSDGTargets')
  @Redirect('sdg-targets', HttpStatus.MOVED_PERMANENTLY)
  getSDGTargets() {
    // nothing, we are just going to redirect
  }

  @Get('allSDGIndicators')
  @Redirect('sdg-indicators', HttpStatus.MOVED_PERMANENTLY)
  getSDGTIndicators() {
    // nothing, we are just going to redirect
  }

  @Get('allInitiatives')
  @Redirect('initiatives', HttpStatus.MOVED_PERMANENTLY)
  getInitiatives() {
    // nothing, we are just going to redirect
  }

  @Get('actionAreaOutcomes')
  @Redirect('action-area-outcomes', HttpStatus.MOVED_PERMANENTLY)
  getActionAreaOutcomes() {
    // nothing, we are just going to redirect
  }

  @Get('actionAreaOutcomeIndicators')
  @Redirect('action-area-outcome-indicators', HttpStatus.MOVED_PERMANENTLY)
  getActionAreaOutcomeIndicators() {
    // nothing, we are just going to redirect
  }

  // FIXME find how to do this redirect, as Postman identifies this
  // as a redirect loop
  /*@Get('MELIA/study-types')
  @Redirect('study-types', HttpStatus.MOVED_PERMANENTLY)
  getStudyTypes() {
    // nothing, we are just going to redirect
  }*/

  @Get('type-of-innovations')
  @Redirect('innovation-types', HttpStatus.MOVED_PERMANENTLY)
  getInnovationTypes() {
    // nothing, we are just going to redirect
  }

  // FIXME find how to do this redirect, as this endpoint already
  // exist
  /*@Get('user')
  @Redirect('oc-users', HttpStatus.MOVED_PERMANENTLY)
  getOneCGIARUsers() {
    // nothing, we are just going to redirect
  }*/

  @Get('onecgiar-entities')
  @Redirect('cgiar-entities', HttpStatus.MOVED_PERMANENTLY)
  getCGIAREntities() {
    // nothing, we are just going to redirect
  }

  @Get('accountTypes')
  @Redirect('account-types', HttpStatus.MOVED_PERMANENTLY)
  getAccountTypes() {
    // nothing, we are just going to redirect
  }

  @Get('scienceGroups')
  @Redirect('science-groups', HttpStatus.MOVED_PERMANENTLY)
  getScienceGroups() {
    // nothing, we are just going to redirect
  }

  @Get('institutionsSimple')
  @Redirect('institutions/simple', HttpStatus.MOVED_PERMANENTLY)
  getInstitutionsSimple() {
    // nothing, we are just going to redirect
  }

  @Get('impact-areas-indicators')
  @Redirect('impact-area-indicators', HttpStatus.MOVED_PERMANENTLY)
  getImpactAreaIndicators() {
    // nothing, we are just going to redirect
  }

  @Get('projectedBenefits')
  @Redirect('projected-benefits', HttpStatus.MOVED_PERMANENTLY)
  getProjectedBenefits() {
    // nothing, we are just going to redirect
  }

  @Get('globalTargets')
  @Redirect('global-targets', HttpStatus.MOVED_PERMANENTLY)
  getGlobalTargets() {
    // nothing, we are just going to redirect
  }

  @Get('projectedBenefitsProbabilities')
  @Redirect('projected-benefit-probabilities', HttpStatus.MOVED_PERMANENTLY)
  getProjectedBenefitProbabilities() {
    // nothing, we are just going to redirect
  }

  @Post('/:mis/institutions/institution-requests')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  institutionRequests(
    @GetUserData() userData: UserData,
    @Body() newPartnerRequest: CreatePartnerRequestDto,
    @Param('mis') mis: string,
  ): Promise<ResponseDto<PartnerRequestDto>> {
    const userDataMis: UserData & { mis: string } = {
      ...userData,
      mis,
    };

    return this._partnerRequestService.createPartnerRequest(
      newPartnerRequest,
      userDataMis,
    );
  }

  @Post('/:mis/institutions/country-office-requests')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  countryOfficeRequests(
    @GetUserData() userData: UserData,
    @Body() newCountryOfficeRequest: CreateCountryOfficeRequestDto,
    @Param('mis') mis: string,
  ): Promise<ResponseDto<CountryOfficeRequestDto[]>> {
    const userDataMis: UserData & { mis: string } = {
      ...userData,
      mis,
    };

    return this._countryOfficeRequestService.createCountryOfficeRequest(
      newCountryOfficeRequest,
      userDataMis,
    );
  }

  @Post('qa-token')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  generateQaToken(@Body() createQaTokenDto: CreateQaTokenAuthDto) {
    return this.qaTokenAuthService.create(createQaTokenDto);
  }
}
