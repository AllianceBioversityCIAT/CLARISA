import { Injectable } from '@nestjs/common';
import { DataSource, Repository, FindOptionsRelations } from 'typeorm';
import { CountryOfficeRequestDto } from '../dto/country-office-request.dto';
import { CreateCountryOfficeRequestDto } from '../dto/create-country-office-request.dto';
import { RespondRequestDto } from '../../../shared/entities/dtos/respond-request.dto';
import { CountryOfficeRequest } from '../entities/country-office-request.entity';
import { UpdateCountryOfficeRequestDto } from '../dto/update-country-office-request.dto';
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
import { MisOption } from '../../../shared/entities/enums/mises-options';
import { PartnerStatus } from '../../../shared/entities/enums/partner-status';
import { RegionTypeEnum } from '../../../shared/entities/enums/region-types';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';

@Injectable()
export class CountryOfficeRequestRepository extends Repository<CountryOfficeRequest> {
  private readonly requestRelations: FindOptionsRelations<CountryOfficeRequest> =
    {
      country_object: {
        country_region_array: {
          region_object: {
            parent_object: true,
          },
        },
      },
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
  ) {
    super(CountryOfficeRequest, dataSource.createEntityManager());
  }

  async findCountryOfficeRequestById(
    id: number,
  ): Promise<CountryOfficeRequestDto> {
    return this.findCountryOfficeRequests(
      PartnerStatus.ALL.path,
      MisOption.ALL.path,
      [id],
    ).then((value) => (value.length === 0 ? null : value[0]));
  }

  async findCountryOfficeRequests(
    status: string = PartnerStatus.PENDING.path,
    mis: string = MisOption.ALL.path,
    requestIds?: number[],
  ): Promise<CountryOfficeRequestDto[]> {
    const incomingMis = MisOption.getfromPath(mis);
    let whereClause: string = '';
    const whereValues: (string | number)[] = [];

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
        whereClause = 'where mis_id = ?';
        whereValues.push(incomingMis.mis_id);
        break;
    }

    switch (status) {
      case PartnerStatus.ALL.path:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case PartnerStatus.PENDING.path:
        whereClause += `${!whereClause ? 'where' : ' and'} accepted_by is null and rejected_by is null`;
        break;
      case PartnerStatus.ACCEPTED.path:
      case PartnerStatus.REJECTED.path:
        whereClause += `${!whereClause ? 'where' : ' and'} accepted_by is ${status === PartnerStatus.ACCEPTED.path ? 'not null' : 'null'} and rejected_by is ${status === PartnerStatus.REJECTED.path ? 'not null' : 'null'}`;
        break;
    }

    if (requestIds) {
      const idPlaceholders = requestIds.map(() => '?').join(', ');
      whereClause += `${!whereClause ? 'where' : ' and'} cor.id in (${idPlaceholders})`;
      whereValues.push(...requestIds);
    }

    const query: string = `
      select cor.id, (
        case 
          when cor.accepted_by is null and cor.rejected_by is null then 'Pending'
          when cor.accepted_by is not null then 'Accepted'
          when cor.rejected_by is not null then 'Rejected'
          else 'Unknown'
        end
      ) as requestStatus,
      cor.reject_justification as rejectJustification, cor.request_source as requestSource,
      cor.external_user_mail as externalUserMail, cor.external_user_name as externalUserName,
      cor.external_user_comments as externalUserComments, json_object(
        "code", c.id,
        "isoAlpha2", c.iso_alpha_2,
        "isoAlpha3", c.iso_alpha_3,
        "name", c.name,
        "regionDTO", (
          select json_object(
            "name", r.name,
            "um49Code", r.iso_numeric
          )
          from country_regions cr
          right join regions r on r.region_type_id = 1 
            and r.id = cr.region_id and r.is_active
          where cr.country_id = c.id and cr.is_active
        )
      ) as countryDTO, json_object("code", cor.institution_id) as institutionDTO
      from country_office_requests cor
      left join countries c on cor.country_id = c.id
      ${whereClause}
    `;

    return await this.query(query, whereValues).then(
      (cors: CountryOfficeRequestDto[]) => {
        if (cors.length === 0) {
          return [];
        }

        return this.institutionRepository
          .findInstitutions(
            FindAllOptions.SHOW_ONLY_ACTIVE,
            undefined,
            cors.map((c) => c.institutionDTO.code),
          )
          .then((insts) => {
            return cors.map((cor) => {
              cor.institutionDTO = insts.find(
                (i) => i.code === cor.institutionDTO.code,
              );
              return cor;
            });
          });
      },
    );
  }

  private fillOutCountryOfficeRequestDto(cof: CountryOfficeRequest) {
    const countryOfficeRequestDto: CountryOfficeRequestDto =
      new CountryOfficeRequestDto();

    countryOfficeRequestDto.id = cof.id;
    const status: boolean | undefined = cof.accepted_by
      ? true
      : cof.rejected_by
        ? false
        : undefined;
    countryOfficeRequestDto.requestStatus = this.getRequestStatus(status);
    countryOfficeRequestDto.requestJustification = cof.reject_justification;
    countryOfficeRequestDto.requestSource = cof.request_source;
    countryOfficeRequestDto.externalUserMail = cof.external_user_mail;
    countryOfficeRequestDto.externalUserName = cof.external_user_name;
    countryOfficeRequestDto.externalUserComments = cof.external_user_comments;

    countryOfficeRequestDto.countryDTO = this.fillOutCountryInfo(
      cof.country_object,
    );

    countryOfficeRequestDto.institutionDTO = this.fillOutInstitutionInfo(
      cof.institution_object,
    );
    return countryOfficeRequestDto;
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

  async createCountryOfficeRequest(
    incomingCountryOfficeRequest: CreateCountryOfficeRequestDto,
    partialCountryOfficeRequests: CountryOfficeRequest[],
  ): Promise<CountryOfficeRequestDto[]> {
    return Promise.all(
      partialCountryOfficeRequests.map(async (partialCountryOfficeRequest) => {
        partialCountryOfficeRequest.request_source =
          incomingCountryOfficeRequest.requestSource;
        partialCountryOfficeRequest.external_user_mail =
          incomingCountryOfficeRequest.externalUserMail;
        partialCountryOfficeRequest.external_user_name =
          incomingCountryOfficeRequest.externalUserName;
        partialCountryOfficeRequest.external_user_comments =
          incomingCountryOfficeRequest.externalUserComments;

        partialCountryOfficeRequest.country_id =
          partialCountryOfficeRequest.country_object.id;
        partialCountryOfficeRequest.mis_id =
          partialCountryOfficeRequest.mis_object.id;

        partialCountryOfficeRequest.auditableFields.created_by =
          partialCountryOfficeRequest.auditableFields.created_by_object.id;

        partialCountryOfficeRequest = await this.save(
          partialCountryOfficeRequest,
        );

        partialCountryOfficeRequest = await this.findOne({
          where: { id: partialCountryOfficeRequest.id },
          relations: this.requestRelations,
        });

        return this.fillOutCountryOfficeRequestDto(partialCountryOfficeRequest);
      }),
    );
  }

  async respondCountryOfficeRequest(
    partialCountryOfficeRequest: CountryOfficeRequest,
    respondCountryOfficeRequestDto: RespondRequestDto,
  ): Promise<CountryOfficeRequestDto> {
    partialCountryOfficeRequest.auditableFields.is_active = false;
    partialCountryOfficeRequest.external_user_mail =
      respondCountryOfficeRequestDto.externalUserMail;
    partialCountryOfficeRequest.external_user_name =
      respondCountryOfficeRequestDto.externalUserName;
    partialCountryOfficeRequest.external_user_comments =
      respondCountryOfficeRequestDto.externalUserComments;

    const accepted = respondCountryOfficeRequestDto.accept;

    partialCountryOfficeRequest.auditableFields.modification_justification =
      accepted
        ? `Accepted on ${partialCountryOfficeRequest.accepted_date.toISOString()}`
        : respondCountryOfficeRequestDto.rejectJustification;

    partialCountryOfficeRequest.auditableFields.updated_by = accepted
      ? partialCountryOfficeRequest.accepted_by
      : partialCountryOfficeRequest.rejected_by;

    partialCountryOfficeRequest = await this.save(partialCountryOfficeRequest);

    await this.institutionRepository.createInstitutionCountry(
      partialCountryOfficeRequest,
      false,
    );

    return this.fillOutCountryOfficeRequestDto(partialCountryOfficeRequest);
  }

  async updateCountryOfficeRequest(
    updateCountryOfficeRequest: UpdateCountryOfficeRequestDto,
    countryOfficeRequest: CountryOfficeRequest,
  ): Promise<CountryOfficeRequestDto> {
    countryOfficeRequest.country_id = countryOfficeRequest.country_object.id;

    countryOfficeRequest.auditableFields.updated_by =
      countryOfficeRequest.auditableFields.updated_by_object.id;
    countryOfficeRequest.auditableFields.modification_justification =
      updateCountryOfficeRequest.modification_justification;

    countryOfficeRequest = await this.save(countryOfficeRequest);

    countryOfficeRequest = await this.findOne({
      where: { id: countryOfficeRequest.id },
      relations: this.requestRelations,
    });

    return this.fillOutCountryOfficeRequestDto(countryOfficeRequest);
  }
}
