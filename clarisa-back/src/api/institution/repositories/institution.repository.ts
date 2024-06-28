import { Injectable } from '@nestjs/common';
import {
  DataSource,
  FindOptionsRelations,
  FindOptionsWhere,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { CountryOfficeRequest } from '../../country-office-request/entities/country-office-request.entity';
import { InstitutionDictionaryDto } from '../../institution-dictionary/dto/institution-dictionary.dto';
import { InstitutionTypeDto } from '../../institution-type/dto/institution-type.dto';
import { PartnerRequest } from '../../partner-request/entities/partner-request.entity';
import { InstitutionCountryDto } from '../dto/institution-country.dto';
import { InstitutionSimpleDto } from '../dto/institution-simple.dto';
import { InstitutionDto } from '../dto/institution.dto';
import { InstitutionLocation } from '../entities/institution-location.entity';
import { Institution } from '../entities/institution.entity';
import { InstitutionLocationRepository } from './institution-location.repository';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';

@Injectable()
export class InstitutionRepository extends Repository<Institution> {
  private readonly institutionRelations: FindOptionsRelations<Institution> = {
    institution_type_object: true,
    institution_locations: {
      country_object: true,
    },
  };

  constructor(
    private dataSource: DataSource,
    private institutionLocationRepository: InstitutionLocationRepository,
  ) {
    super(Institution, dataSource.createEntityManager());
  }

  async findAllInstitutions(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    from: string = undefined,
  ): Promise<InstitutionDto[]> {
    const institutionDtos: InstitutionDto[] = [];
    let whereClause: FindOptionsWhere<Institution> = {};

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
        break;
    }

    if (from) {
      whereClause = {
        ...whereClause,
        auditableFields: { updated_at: MoreThanOrEqual(new Date(+from)) },
      };
    }

    const institution: Institution[] = await this.find({
      where: whereClause,
      relations: this.institutionRelations,
    });

    await Promise.all(
      institution.map(async (i) => {
        const institutionDto: InstitutionDto = this.fillOutInstitutionInfo(
          i,
          option === FindAllOptions.SHOW_ALL,
        );
        institutionDtos.push(institutionDto);
      }),
    );

    return institutionDtos;
  }

  async findAllInstitutionsSimple(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<InstitutionSimpleDto[]> {
    let whereClause: FindOptionsWhere<Institution> = {};
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
        break;
    }

    const institution: Institution[] = await this.find({
      where: whereClause,
      relations: this.institutionRelations,
    });

    return institution.map((i) => {
      const institutionDto: InstitutionSimpleDto = new InstitutionSimpleDto();

      institutionDto.code = i.id;
      institutionDto.acronym = i.acronym;

      const hq: InstitutionLocation = i.institution_locations.find(
        (il) => il.is_headquater,
      );
      institutionDto.hqLocation = hq.country_object.name;

      institutionDto.hqLocationISOalpha2 = hq.country_object.iso_alpha_2;
      institutionDto.institutionType = i.institution_type_object.name;
      institutionDto.institutionTypeId = i.institution_type_object.id;
      institutionDto.name = i.name;
      institutionDto.websiteLink = i.website_link;

      return institutionDto;
    });
  }

  private fillOutInstitutionInfo(
    institution: Institution,
    showActiveField = false,
  ): InstitutionDto {
    const institutionDto: InstitutionDto = new InstitutionDto();

    institutionDto.code = institution.id;
    institutionDto.name = institution.name;
    institutionDto.acronym = institution.acronym;
    institutionDto.websiteLink = institution.website_link;
    institutionDto.added = institution.auditableFields.created_at;
    if (showActiveField) {
      institutionDto.is_active = institution.auditableFields.is_active;
    }

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

  async findAllInstitutionSourceEntries(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<InstitutionDictionaryDto[]> {
    let institutionDictionaryDtos: InstitutionDictionaryDto[] = [];

    try {
      const query = `
        select i.id as code, i.acronym, c.name as hqLocation, c.iso_alpha_2 as hqLocationISOalpha2,
        ${option !== FindAllOptions.SHOW_ONLY_ACTIVE ? 'i.is_active,' : ''}
          it.name as institutionType, it.id as institutionTypeId, i.name, i.website_link as websiteLink,
          (
            select json_arrayagg(json_object(
              "source", s_q1.name,
              "institutionCode", id_q1.institution_source_id,
              "institutionName", id_q1.institution_source_name
            ))
            from institution_dictionary id_q1
            join sources s_q1 on id_q1.source_id = s_q1.id and s_q1.is_active
            where id_q1.is_active and id_q1.institution_id = i.id
          ) as institutionRelatedList
        from institutions i
        left join institution_locations il on il.institution_id = i.id and il.is_active and il.is_headquater 
        left join countries c on il.country_id = c.id
        left join institution_types it on i.institution_type_id = it.id
        where i.is_active in (?)
      `;

      institutionDictionaryDtos = await this.dataSource.query(query, [
        option === FindAllOptions.SHOW_ALL
          ? '1,0'
          : option === FindAllOptions.SHOW_ONLY_ACTIVE
          ? '1'
          : '0',
      ]);

      return institutionDictionaryDtos;
    } catch (error) {
      console.log(error);
      throw Error('Error fetching simple old institutions');
    }
  }

  async createInstitutionCountry(
    request: CountryOfficeRequest | PartnerRequest,
    isHQ: boolean,
  ): Promise<InstitutionLocation> {
    const institutionLocation: InstitutionLocation = new InstitutionLocation();
    institutionLocation.auditableFields = new AuditableEntity();

    institutionLocation.country_id = request.country_id;
    institutionLocation.institution_id = request.institution_id;
    institutionLocation.is_headquater = isHQ;
    institutionLocation.auditableFields.created_at = request.accepted_date;
    institutionLocation.auditableFields.created_by = request.accepted_by;

    return this.institutionLocationRepository.save(institutionLocation);
  }

  async createInstitution(
    partnerRequest: PartnerRequest,
  ): Promise<InstitutionDto> {
    let institution: Institution = new Institution();
    institution.auditableFields = new AuditableEntity();

    institution.acronym = partnerRequest.acronym;
    institution.name = partnerRequest.partner_name;
    institution.website_link = partnerRequest.web_page;
    institution.institution_type_id = partnerRequest.institution_type_id;
    institution.auditableFields.created_at = partnerRequest.accepted_date;
    institution.auditableFields.created_by = partnerRequest.accepted_by;

    institution = await this.save(institution);
    partnerRequest.institution_id = institution.id;

    await this.createInstitutionCountry(partnerRequest, true);

    institution = await this.findOne({
      where: {
        id: institution.id,
      },
      relations: this.institutionRelations,
    });

    return this.fillOutInstitutionInfo(institution);
  }

  async createInstitutionCountryBulk(
    countryAndInstitution: number,
    id_institution: number,
    isHQ: boolean,
    createBy: number,
  ) {
    const institutionLocation: InstitutionLocation = new InstitutionLocation();
    institutionLocation.auditableFields = new AuditableEntity();

    institutionLocation.country_id = countryAndInstitution;
    institutionLocation.is_headquater = isHQ;
    institutionLocation.institution_id = id_institution;
    institutionLocation.auditableFields.created_by = createBy;

    return this.institutionLocationRepository.save(institutionLocation);
  }

  async createBulkInstitution(
    BulkInstitutions: PartnerRequest,
    createBy: number,
  ) {
    let institution: Institution = new Institution();
    institution.auditableFields = new AuditableEntity();

    institution.acronym = BulkInstitutions.acronym;
    institution.name = BulkInstitutions.partner_name;
    institution.website_link = BulkInstitutions.web_page;

    institution.institution_type_id = BulkInstitutions.institution_type_id;
    institution.auditableFields.created_by = createBy;
    institution = await this.save(institution);
    await this.createInstitutionCountryBulk(
      BulkInstitutions.country_id,
      institution.id,
      true,
      createBy,
    );

    return institution;
  }
}
