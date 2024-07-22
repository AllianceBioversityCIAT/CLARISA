import { Injectable } from '@nestjs/common';
import {
  DataSource,
  FindOptionsRelations,
  FindOptionsWhere,
  IsNull,
  Not,
  Repository,
} from 'typeorm';
import { RespondRequestDto } from '../../../shared/entities/dtos/respond-request.dto';
import { MisOption } from '../../../shared/entities/enums/mises-options';
import { PartnerStatus } from '../../../shared/entities/enums/partner-status';
import { RegionTypeEnum } from '../../../shared/entities/enums/region-types';
import { MailUtil } from '../../../shared/utils/mailer.util';
import { CountryDto } from '../../country/dto/country.dto';
import { Country } from '../../country/entities/country.entity';
import { InstitutionTypeDto } from '../../institution-type/dto/institution-type.dto';
import { InstitutionCountryDto } from '../../institution/dto/institution-country.dto';
import { InstitutionDto } from '../../institution/dto/institution.dto';
import { Institution } from '../../institution/entities/institution.entity';
import { InstitutionRepository } from '../../institution/repositories/institution.repository';
import { ParentRegionDto } from '../../region/dto/parent-region.dto';
import { SimpleRegionDto } from '../../region/dto/simple-region.dto';
import { Region } from '../../region/entities/region.entity';
import { CreatePartnerRequestDto } from '../dto/create-partner-request.dto';
import { PartnerRequestDto } from '../dto/partner-request.dto';
import { UpdatePartnerRequestDto } from '../dto/update-partner-request.dto';
import { PartnerRequest } from '../entities/partner-request.entity';
import { CreateBulkPartnerRequestDto } from '../dto/create-bulk-partner-request.dto';
import { InstitutionType } from '../../institution-type/entities/institution-type.entity';
import { CountryRepository } from '../../country/repositories/country.repository';
import { InstitutionTypeRepository } from '../../institution-type/repositories/institution-type.repository';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { PartnerStatsDto } from '../dto/partner-stats.dto';

@Injectable()
export class PartnerRequestRepository extends Repository<PartnerRequest> {
  private readonly partnerRelations: FindOptionsRelations<PartnerRequest> = {
    country_object: {
      country_region_array: {
        region_object: {
          parent_object: true,
        },
      },
    },
    mis_object: true,
    institution_type_object: true,
    institution_object: {
      institution_type_object: true,
      institution_locations: {
        country_object: {
          country_region_array: {
            region_object: {
              parent_object: true,
            },
          },
        },
      },
    },
  };

  constructor(
    private dataSource: DataSource,
    private institutionRepository: InstitutionRepository,
    private mailUtil: MailUtil,
    private countryRepository: CountryRepository,
    private institutionType: InstitutionTypeRepository,
  ) {
    super(PartnerRequest, dataSource.createEntityManager());
  }

  async findPartnerRequestById(id: number): Promise<PartnerRequestDto> {
    return this.findOne({
      where: { id },
      relations: this.partnerRelations,
    }).then((pr) => this.fillOutPartnerRequestDto(pr));
  }

  async findAllPartnerRequests(
    status: string = PartnerStatus.PENDING.path,
    mis: string = MisOption.ALL.path,
    show: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<PartnerRequestDto[]> {
    const partnerRequestDtos: PartnerRequestDto[] = [];
    let whereClause: FindOptionsWhere<PartnerRequest> = {
      partner_request_id: Not(IsNull()),
    };
    const incomingMis = MisOption.getfromPath(mis);
    const incomingStatus = PartnerStatus.getfromPath(status);

    switch (mis) {
      case MisOption.ALL.path:
        // do nothing. no extra conditions needed
        break;
      case MisOption.AICCRA.path:
      case MisOption.CGSPACE.path:
      case MisOption.CLARISA.path:
      case MisOption.ECONTRACTS.path:
      case MisOption.FORESIGHT.path:
      case MisOption.MEL.path:
      case MisOption.OST.path:
      case MisOption.TOC.path:
      case MisOption.PRMS.path:
      case MisOption.MARLO.path:
      case MisOption.PIPELINE.path:
        whereClause = {
          ...whereClause,
          mis_id: incomingMis.mis_id,
        };
        break;
      default:
        throw Error('?!');
    }

    switch (status) {
      case PartnerStatus.ALL.path:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case PartnerStatus.PENDING.path:
        whereClause = {
          ...whereClause,
          accepted: IsNull(),
        };
        break;
      case PartnerStatus.ACCEPTED.path:
      case PartnerStatus.REJECTED.path:
        whereClause = {
          ...whereClause,
          accepted: incomingStatus === PartnerStatus.ACCEPTED,
        };
        break;
    }

    switch (show) {
      case FindAllOptions.SHOW_ALL:
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          ...whereClause,
          auditableFields: {
            is_active: show === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
    }

    const partnerRequest: PartnerRequest[] = await this.find({
      where: whereClause,
      relations: this.partnerRelations,
    });

    await Promise.all(
      partnerRequest.map(async (pr) => {
        const partnerRequestDto: PartnerRequestDto =
          this.fillOutPartnerRequestDto(pr);

        partnerRequestDtos.push(partnerRequestDto);
      }),
    );

    return partnerRequestDtos;
  }

  private fillOutPartnerRequestDto(pr: PartnerRequest) {
    const partnerRequestDto: PartnerRequestDto = new PartnerRequestDto();

    partnerRequestDto.id = pr.id;
    partnerRequestDto.partnerName = pr.partner_name;
    partnerRequestDto.acronym = pr.acronym;
    partnerRequestDto.webPage = pr.web_page;
    partnerRequestDto.mis = pr.mis_object.acronym;
    partnerRequestDto.requestStatus = this.getRequestStatus(pr.accepted);
    partnerRequestDto.requestJustification = pr.reject_justification;
    partnerRequestDto.requestSource = pr.request_source;
    partnerRequestDto.externalUserMail = pr.external_user_mail;
    partnerRequestDto.externalUserName = pr.external_user_name;
    partnerRequestDto.externalUserComments = pr.external_user_comments;
    partnerRequestDto.category_1 = pr.category_1;
    partnerRequestDto.category_2 = pr.category_2;
    partnerRequestDto.created_at = pr.auditableFields.created_at;
    partnerRequestDto.countryDTO = this.fillOutCountryInfo(pr.country_object);

    partnerRequestDto.institutionTypeDTO = new InstitutionTypeDto();
    partnerRequestDto.institutionTypeDTO.code = pr.institution_type_object.id;
    partnerRequestDto.institutionTypeDTO.name = pr.institution_type_object.name;
    partnerRequestDto.institutionTypeDTO.id_parent =
      pr.institution_type_object.parent_id;
    if (pr.institution_id) {
      partnerRequestDto.institutionDTO = this.fillOutInstitutionInfo(
        pr.institution_object,
      );
    }
    return partnerRequestDto;
  }

  private getRequestStatus(accepted: boolean | undefined): string {
    // this did not work for some odd reason in TS; in JS it works just fine
    //return (accepted === undefined ? 'Pending' : (accepted ? 'Accepted', 'Rejected'));
    if (accepted == undefined) {
      return PartnerStatus.PENDING.name;
    }

    return accepted ? PartnerStatus.ACCEPTED.name : PartnerStatus.REJECTED.name;
  }

  private fillOutCountryInfo(country: Country): CountryDto {
    const countryDto = new CountryDto();

    countryDto.code = country.id;
    countryDto.isoAlpha2 = country.iso_alpha_2;
    countryDto.isoAlpha3 = country.iso_alpha_3;
    countryDto.name = country.name;

    countryDto.regionDTO = this.fillOutRegionInfo(
      country.country_region_array.map((cr) => cr.region_object),
    );

    return countryDto;
  }

  private fillOutRegionInfo(regions: Region[]): SimpleRegionDto {
    let regionDto = null;
    const region: Region = regions.find(
      (r) => r.region_type_id === RegionTypeEnum.CGIAR_REGION,
    );

    if (region) {
      regionDto = new SimpleRegionDto();

      regionDto.name = region.name;
      regionDto.um49Code = region.iso_numeric;

      if (regionDto.parentRegion) {
        regionDto.parentRegion = new ParentRegionDto();
        regionDto.parentRegion.name = region.parent_object.name;
        regionDto.parentRegion.um49Code = region.parent_object.iso_numeric;
      }
    }

    return regionDto;
  }

  private fillOutInstitutionInfo(institution: Institution): InstitutionDto {
    const institutionDto: InstitutionDto = new InstitutionDto();

    institutionDto.code = institution.id;
    institutionDto.name = institution.name;
    institutionDto.acronym = institution.acronym;
    institutionDto.websiteLink = institution.website_link;
    institutionDto.added = institution.auditableFields.created_at;

    institutionDto.countryOfficeDTO = institution.institution_locations.map(
      (il) => {
        const countryDto: InstitutionCountryDto = new InstitutionCountryDto();

        countryDto.code = il.country_object.id;
        countryDto.isHeadquarter = il.is_headquater;
        countryDto.isoAlpha2 = il.country_object.iso_alpha_2;
        countryDto.name = il.country_object.name;
        countryDto.regionDTO = null;

        return countryDto;
      },
    );

    institutionDto.institutionType = new InstitutionTypeDto();
    institutionDto.institutionType.code =
      institution.institution_type_object.id;
    institutionDto.institutionType.name =
      institution.institution_type_object.name;

    return institutionDto;
  }

  async createPartnerRequest(
    incomingPartnerRequest: CreatePartnerRequestDto,
    partialPartnerRequest: PartnerRequest,
  ): Promise<PartnerRequestDto> {
    partialPartnerRequest.partner_name = incomingPartnerRequest.name;
    partialPartnerRequest.acronym = incomingPartnerRequest.acronym;
    partialPartnerRequest.web_page = incomingPartnerRequest.websiteLink;
    partialPartnerRequest.is_office = false;
    partialPartnerRequest.request_source = incomingPartnerRequest.requestSource;
    partialPartnerRequest.external_user_mail =
      incomingPartnerRequest.externalUserMail;
    partialPartnerRequest.external_user_name =
      incomingPartnerRequest.externalUserName;
    partialPartnerRequest.external_user_comments =
      incomingPartnerRequest.externalUserComments;

    partialPartnerRequest.institution_type_id =
      partialPartnerRequest.institution_type_object.id;
    partialPartnerRequest.country_id = partialPartnerRequest.country_object.id;
    partialPartnerRequest.mis_id = partialPartnerRequest.mis_object.id;

    partialPartnerRequest.auditableFields.created_by =
      partialPartnerRequest.auditableFields.created_by_object.id;

    partialPartnerRequest.category_1 = incomingPartnerRequest.category_1;
    partialPartnerRequest.category_2 = incomingPartnerRequest.category_2;

    partialPartnerRequest.auditableFields.is_active = false;
    partialPartnerRequest = await this.save(partialPartnerRequest);
    partialPartnerRequest.partner_request_id = partialPartnerRequest.id;
    delete partialPartnerRequest.id;
    partialPartnerRequest.auditableFields.is_active = true;
    partialPartnerRequest = await this.save(partialPartnerRequest);
    partialPartnerRequest = await this.findOne({
      where: { id: partialPartnerRequest.id },
      relations: this.partnerRelations,
    });
    const informationEmail: any = await partialPartnerRequest;
    this.mailUtil.sendNewPartnerRequestNotification(informationEmail);

    return this.fillOutPartnerRequestDto(partialPartnerRequest);
  }

  async respondPartnerRequest(
    partialPartnerRequest: PartnerRequest,
    respondPartnerRequestDto: RespondRequestDto,
  ): Promise<PartnerRequestDto> {
    partialPartnerRequest.auditableFields.is_active = false;
    if (partialPartnerRequest.partner_request_id == null) {
      await this.save(partialPartnerRequest);
      partialPartnerRequest.partner_request_id = partialPartnerRequest.id;
      delete partialPartnerRequest.id;
    }

    partialPartnerRequest.external_user_mail =
      respondPartnerRequestDto.externalUserMail;
    partialPartnerRequest.external_user_name =
      respondPartnerRequestDto.externalUserName;
    partialPartnerRequest.external_user_comments =
      respondPartnerRequestDto.externalUserComments;

    const accepted = respondPartnerRequestDto.accept;
    partialPartnerRequest.accepted = accepted;

    partialPartnerRequest.auditableFields.updated_by = accepted
      ? partialPartnerRequest.accepted_by
      : partialPartnerRequest.rejected_by;

    this.mailUtil.sendResponseToPartnerRequest(partialPartnerRequest);

    if (accepted) {
      const newInstitution = await this.institutionRepository.createInstitution(
        partialPartnerRequest,
      );
      partialPartnerRequest.institution_id = newInstitution.code;
    }
    partialPartnerRequest = await this.save(partialPartnerRequest);
    partialPartnerRequest = await this.findOne({
      where: { id: partialPartnerRequest.id },
      relations: this.partnerRelations,
    });

    return this.fillOutPartnerRequestDto(partialPartnerRequest);
  }

  async updatePartnerRequest(
    updatePartnerRequest: UpdatePartnerRequestDto,
    partnerRequest: PartnerRequest,
  ): Promise<PartnerRequestDto> {
    if (partnerRequest.partner_request_id == null) {
      partnerRequest.auditableFields.is_active = false;
      await this.save(partnerRequest);
      partnerRequest.partner_request_id = partnerRequest.id;
      delete partnerRequest.id;
    }

    partnerRequest.auditableFields.is_active = true;
    partnerRequest.partner_name = updatePartnerRequest.name;
    partnerRequest.acronym = updatePartnerRequest.acronym;
    partnerRequest.web_page = updatePartnerRequest.websiteLink;
    partnerRequest.institution_type_id =
      partnerRequest.institution_type_object.id;
    partnerRequest.country_id = partnerRequest.country_object.id;
    partnerRequest.category_1 = updatePartnerRequest.category_1;
    partnerRequest.category_2 = updatePartnerRequest.category_2;
    partnerRequest.auditableFields.updated_by =
      partnerRequest.auditableFields.updated_by_object.id;
    partnerRequest.auditableFields.modification_justification =
      updatePartnerRequest.modification_justification;

    partnerRequest = await this.save(partnerRequest);

    partnerRequest = await this.findOne({
      where: { id: partnerRequest.id },
      relations: this.partnerRelations,
    });

    return this.fillOutPartnerRequestDto(partnerRequest);
  }

  async statisticsPartner(mis: string = MisOption.ALL.path) {
    const query = `
      select 
        count(pr.id) as total,
        sum(case when pr.accepted = 0 then 1 else 0 end) as rejected,
        sum(case when pr.accepted = 1 then 1 else 0 end) as accepted,
        sum(case when pr.accepted is null then 1 else 0 end) as pending
      from partner_requests pr
      where pr.partner_request_id is not null
      ${mis !== MisOption.ALL.path ? `and pr.mis_id = '${mis}'` : ''}
    `;

    return this.query(query) as Promise<PartnerStatsDto>;
  }

  async createPartnerRequestBulk(
    partnerRequestBulk: CreateBulkPartnerRequestDto,
  ) {
    let bulkInstitutions: Institution;
    const partnerCreate: any[] = [];
    const today = new Date();

    const countryInstitution: Country[] = await this.countryRepository.find();
    const institutionTypes: InstitutionType[] = await this.institutionType.find(
      {
        where: {
          source_id: 1,
        },
      },
    );

    for (const partnerRequestBulkIterator of partnerRequestBulk.listPartnerRequest) {
      let partnerRequests: PartnerRequest = new PartnerRequest();
      partnerRequests.auditableFields = new AuditableEntity();
      partnerRequests.partner_name = partnerRequestBulkIterator.name;
      partnerRequests.acronym = partnerRequestBulkIterator.acronym;
      partnerRequests.web_page = partnerRequestBulkIterator.website_link;
      partnerRequests.is_office = false;
      partnerRequests.external_user_mail = partnerRequestBulk.externalUserEmail;
      partnerRequests.external_user_name = partnerRequestBulk.externalUserName;
      partnerRequests.auditableFields.created_by =
        partnerRequestBulk.externalUser;

      const filterCountry = countryInstitution.filter(
        (country) => country.iso_alpha_2 == partnerRequestBulkIterator.country,
      );
      const filterType = institutionTypes.filter(
        (typeIntitution) =>
          typeIntitution.name == partnerRequestBulkIterator.institution_type,
      );
      partnerRequests.institution_type_id = filterType[0].id;
      partnerRequests.country_id = filterCountry[0].id;
      partnerRequests.mis_id = partnerRequestBulk.mis;
      partnerRequests.auditableFields.is_active = false;
      partnerRequests = await this.save(partnerRequests);
      partnerRequests.partner_request_id = partnerRequests.id;
      delete partnerRequests.id;
      if (partnerRequestBulkIterator.status == 'Accepted') {
        partnerRequests.accepted = true;
        partnerRequests.accepted_by = partnerRequestBulk.accepted;
        partnerRequests.accepted_date = today;
        bulkInstitutions =
          await this.institutionRepository.createBulkInstitution(
            partnerRequests,
            partnerRequestBulk.accepted,
          );
        partnerRequests.institution_id = bulkInstitutions.id;
      }
      if (partnerRequestBulkIterator.status == 'Rejected') {
        partnerRequests.accepted = false;
        partnerRequests.rejected_by = partnerRequestBulk.accepted;
        partnerRequests.reject_justification =
          partnerRequestBulkIterator.justification;
        partnerRequests.rejected_date = today;
      }

      partnerRequests = await this.save(partnerRequests);

      partnerCreate.push(partnerRequests);
    }
    return partnerCreate;
  }
}
