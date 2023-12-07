import { Module } from '@nestjs/common';
import { ApiService } from './api.service';
import { ApiController } from './api.controller';
import { RoleModule } from './role/role.module';
import { UserModule } from './user/user.module';
import { ActionAreaModule } from './action-area/action-area.module';
import { GlossaryModule } from './glossary/glossary.module';
import { ImpactAreaModule } from './impact-area/impact-area.module';
import { StudyTypeModule } from './study-type/study-type.module';
import { SdgModule } from './sdg/sdg.module';
import { SdgTargetModule } from './sdg-target/sdg-target.module';
import { ProjectedBenefitProbabilityModule } from './projected-benefit-probability/projected-benefit-probability.module';
import { ProjectedBenefitModule } from './projected-benefit/projected-benefit.module';
import { ActionAreaOutcomeModule } from './action-area-outcome/action-area-outcome.module';
import { OutcomeIndicatorModule } from './outcome-indicator/outcome-indicator.module';
import { ActionAreaOutcomeIndicatorModule } from './action-area-outcome-indicator/action-area-outcome-indicator.module';
import { GeopositionModule } from './geoposition/geoposition.module';
import { RegionTypeModule } from './region-type/region-type.module';
import { RegionModule } from './region/region.module';
import { CountryModule } from './country/country.module';
import { DepthDescriptionModule } from './depth-description/depth-description.module';
import { ProjectedBenefitDepthModule } from './projected-benefit-depth/projected-benefit-depth.module';
import { ProjectedBenefitWeightDescriptionModule } from './projected-benefit-weight-description/projected-benefit-weight-description.module';
import { ProjectedBenefitWeightingModule } from './projected-benefit-weighting/projected-benefit-weighting.module';
import { GeneralAcronymModule } from './general-acronym/general-acronym.module';
import { InnovationReadinessLevelModule } from './innovation-readiness-level/innovation-readiness-level.module';
import { InvestmentTypeModule } from './investment-type/investment-type.module';
import { InnovationUseLevelModule } from './innovation-use-level/innovation-use-level.module';
import { CgiarEntityModule } from './cgiar-entity/cgiar-entity.module';
import { CgiarEntityTypeModule } from './cgiar-entity-type/cgiar-entity-type.module';
import { SdgIndicatorModule } from './sdg-indicator/sdg-indicator.module';
import { OneCgiarUserModule } from './one-cgiar-user/one-cgiar-user.module';
import { BusinessCategoryModule } from './business-category/business-category.module';
import { TechnicalFieldModule } from './technical-field/technical-field.module';
import { InnovationTypeModule } from './innovation-type/innovation-type.module';
import { GovernanceTypeModule } from './governance-type/governance-type.module';
import { EnvironmentalBenefitModule } from './environmental-benefit/environmental-benefit.module';
import { TechnologyDevelopmentStageModule } from './technology-development-stage/technology-development-stage.module';
import { WorkpackageModule } from './workpackage/workpackage.module';
import { InitiativeModule } from './initiative/initiative.module';
import { AccountTypeModule } from './account-type/account-type.module';
import { AccountModule } from './account/account.module';
import { ScienceGroupModule } from './science-group/science-group.module';
import { UnitModule } from './unit/unit.module';
import { AdministrativeScaleModule } from './administrative-scale/administrative-scale.module';
import { GeographicScopeModule } from './geographic-scope/geographic-scope.module';
import { HomepageClarisaCategoryModule } from './homepage-clarisa-category/homepage-clarisa-category.module';
import { HomepageClarisaEndpointModule } from './homepage-clarisa-endpoint/homepage-clarisa-endpoint.module';
import { HomepageClarisaCategoryEndpointModule } from './homepage-clarisa-category-endpoint/homepage-clarisa-category-endpoint.module';
import { IntegrationModule } from 'src/shared/integration/integration.module';
import { MisModule } from './mis/mis.module';
import { InnovationCharacteristicModule } from './innovation-characteristic/innovation-characteristic.module';
import { PolicyStageModule } from './policy-stage/policy-stage.module';
import { InstitutionTypeModule } from './institution-type/institution-type.module';
import { InstitutionModule } from './institution/institution.module';
import { InstitutionDictionaryModule } from './institution-dictionary/institution-dictionary.module';
import { PartnerRequestModule } from './partner-request/partner-request.module';
import { CountryOfficeRequestModule } from './country-office-request/country-office-request.module';
import { PolicyTypeModule } from './policy-type/policy-type.module';
import { BiParameterModule } from './bi-parameter/bi-parameter.module';
import { OldInstitutionModule } from './old-institution/old-institution.module';
import { GlobalTargetModule } from './global-target/global-target.module';
import { BeneficiaryModule } from './beneficiary/beneficiary.module';
import { EndOfInitiativeOutcomeModule } from './end-of-initiative-outcome/end-of-initiative-outcome.module';
import { ImpactAreaIndicatorModule } from './impact-area-indicator/impact-area-indicator.module';
import { SourceModule } from './source/source.module';
import { PermissionModule } from './permission/permission.module';
import { PhaseModule } from './phase/phase.module';
import { SubnationalScopeModule } from './subnational-scope/subnational-scope.module';
import { LanguageModule } from './language/language.module';
import { FirstOrderAdministrativeDivisionModule } from './first-order-administrative-division/first-order-administrative-division.module';
import { SecondOrderAdministrativeDivisionModule } from './second-order-administrative-division/second-order-administrative-division.module';
import { QaTokenAuthService } from '../auth/qa-token-auth/qa-token-auth.service';
import { QaTokenAuthRepository } from '../auth/qa-token-auth/repositories/qa-token-auth.repository';

@Module({
  controllers: [ApiController],
  providers: [ApiService, QaTokenAuthService, QaTokenAuthRepository],
  imports: [
    UserModule,
    RoleModule,
    ActionAreaModule,
    GlossaryModule,
    ImpactAreaModule,
    GlobalTargetModule,
    StudyTypeModule,
    SdgModule,
    SdgTargetModule,
    ImpactAreaIndicatorModule,
    ProjectedBenefitProbabilityModule,
    ProjectedBenefitModule,
    ActionAreaOutcomeModule,
    OutcomeIndicatorModule,
    ActionAreaOutcomeIndicatorModule,
    SourceModule,
    CountryModule,
    GeopositionModule,
    RegionTypeModule,
    RegionModule,
    DepthDescriptionModule,
    ProjectedBenefitDepthModule,
    ProjectedBenefitWeightDescriptionModule,
    ProjectedBenefitWeightingModule,
    GeneralAcronymModule,
    InnovationReadinessLevelModule,
    InvestmentTypeModule,
    InnovationUseLevelModule,
    CgiarEntityModule,
    CgiarEntityTypeModule,
    SdgIndicatorModule,
    OneCgiarUserModule,
    BeneficiaryModule,
    BusinessCategoryModule,
    TechnicalFieldModule,
    InnovationTypeModule,
    GovernanceTypeModule,
    EnvironmentalBenefitModule,
    TechnologyDevelopmentStageModule,
    WorkpackageModule,
    InitiativeModule,
    AccountTypeModule,
    AccountModule,
    ScienceGroupModule,
    UnitModule,
    AdministrativeScaleModule,
    GeographicScopeModule,
    HomepageClarisaCategoryModule,
    HomepageClarisaEndpointModule,
    HomepageClarisaCategoryEndpointModule,
    EndOfInitiativeOutcomeModule,
    IntegrationModule,
    MisModule,
    InnovationCharacteristicModule,
    PolicyStageModule,
    InstitutionTypeModule,
    InstitutionModule,
    InstitutionDictionaryModule,
    PartnerRequestModule,
    CountryOfficeRequestModule,
    PolicyTypeModule,
    BiParameterModule,
    OldInstitutionModule,
    PermissionModule,
    PhaseModule,
    SubnationalScopeModule,
    SecondOrderAdministrativeDivisionModule,
    FirstOrderAdministrativeDivisionModule,
    LanguageModule,
  ],
})
export class ApiModule {}
