import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { CountryOfficeRequest } from '../../country-office-request/entities/country-office-request.entity';
import { InstitutionDictionaryDto } from '../../institution-dictionary/dto/institution-dictionary.dto';
import { PartnerRequest } from '../../partner-request/entities/partner-request.entity';
import { InstitutionSimpleDto } from '../dto/institution-simple.dto';
import { InstitutionDto } from '../dto/institution.dto';
import { InstitutionLocation } from '../entities/institution-location.entity';
import { Institution } from '../entities/institution.entity';
import { InstitutionLocationRepository } from './institution-location.repository';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';

@Injectable()
export class InstitutionRepository extends Repository<Institution> {
  constructor(
    private dataSource: DataSource,
    private institutionLocationRepository: InstitutionLocationRepository,
  ) {
    super(Institution, dataSource.createEntityManager());
  }

  async findInstitutions(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    from: number = undefined,
    institutionIds?: number[],
  ): Promise<InstitutionDto[]> {
    let whereClause: string = '';
    const whereValues: (string | number)[] = [];

    if (from) {
      whereClause += `where i.updated_at >= FROM_UNIXTIME(? / 1000, '%Y-%m-%d %H:%i:%s.%f')`;
      whereValues.push(from);
    }

    if (institutionIds) {
      whereClause += `${whereClause ? ' and' : 'where'} i.id in (?)`;
      whereValues.push(institutionIds.join(','));
    }

    whereClause += `${whereClause ? ' and' : 'where'} i.is_active in (?)`;
    let valueToPush: string;

    if (option === FindAllOptions.SHOW_ALL) {
      valueToPush = '1,0';
    } else if (option === FindAllOptions.SHOW_ONLY_ACTIVE) {
      valueToPush = '1';
    } else {
      valueToPush = '0';
    }

    whereValues.push(valueToPush);

    const query: string = `
      select i.id code, i.name, i.acronym, i.website_link websiteLink,
        i.created_at added, ${option !== FindAllOptions.SHOW_ONLY_ACTIVE ? 'i.is_active,' : ''}
        json_arrayagg(json_object(
          "regionDTO", null,
          "code", il.id,
          "isHeadquarter", il.is_headquater,
          "isoAlpha2", c.iso_alpha_2,
          "name", c.name
        )) countryOfficeDTO, json_object(
          "code", it.id,
          "name", it.name
        ) institutionType
      from institutions i
      left join institution_locations il on il.institution_id = i.id and il.is_active
      left join countries c on il.country_id = c.id
      left join institution_types it on i.institution_type_id = it.id
      ${whereClause}
      group by i.id
    `;

    return await this.query(query, whereValues).catch((error) => {
      throw Error(`Error fetching institutions: ${error}`);
    });
  }

  async findInstitutionById(id: number): Promise<InstitutionDto> {
    return this.findInstitutions(FindAllOptions.SHOW_ALL, undefined, [id]).then(
      (value) => (value ? value[0] : null),
    );
  }

  private _getQueryForInstitutionSimple(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    addInstitutionRelated: boolean = false,
    institutionId?: number,
  ) {
    let whereClause: string = '';
    if (institutionId) {
      whereClause += `where i.id = ?`;
    }

    whereClause += `${whereClause ? ' and' : 'where'} i.is_active in (?)`;

    return `
      select i.id as code, i.acronym, c.name as hqLocation, c.iso_alpha_2 as hqLocationISOalpha2,
        ${option !== FindAllOptions.SHOW_ONLY_ACTIVE ? 'i.is_active,' : ''}
        it.name as institutionType, it.id as institutionTypeId, i.name, i.website_link as websiteLink
        ${
          addInstitutionRelated
            ? `,
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
           `
            : ''
        }
        from institutions i
        left join institution_locations il on il.institution_id = i.id and il.is_active and il.is_headquater 
        left join countries c on il.country_id = c.id
        left join institution_types it on i.institution_type_id = it.id
        ${whereClause}
    `;
  }

  async findInstitutionSourceEntries(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    institutionId?: number,
  ): Promise<InstitutionDictionaryDto[]> {
    const whereValues: (string | number)[] = [];
    if (institutionId) {
      whereValues.push(institutionId);
    }

    let valueToPush: string;

    if (option === FindAllOptions.SHOW_ALL) {
      valueToPush = '1,0';
    } else if (option === FindAllOptions.SHOW_ONLY_ACTIVE) {
      valueToPush = '1';
    } else {
      valueToPush = '0';
    }

    whereValues.push(valueToPush);

    return await this.query(
      this._getQueryForInstitutionSimple(option, true),
      whereValues,
    ).catch((error) => {
      throw Error(`Error fetching simple old institutions: ${error}`);
    });
  }

  async findInstitutionSourceEntriesById(
    id: number,
  ): Promise<InstitutionDictionaryDto> {
    return this.findInstitutionSourceEntries(FindAllOptions.SHOW_ALL, id).then(
      (value) => (value ? value[0] : null),
    );
  }

  async findAllInstitutionsSimple(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    institutionId?: number,
  ): Promise<InstitutionSimpleDto[]> {
    const whereValues: (string | number)[] = [];

    if (institutionId) {
      whereValues.push(institutionId);
    }

    whereValues.push(
      option === FindAllOptions.SHOW_ALL
        ? '1,0'
        : option === FindAllOptions.SHOW_ONLY_ACTIVE
          ? '1'
          : '0',
    );

    return await this.query(
      this._getQueryForInstitutionSimple(option),
      whereValues,
    ).catch((error) => {
      throw Error(`Error fetching simple institutions: ${error}`);
    });
  }

  async findInstitutionSimpleById(id: number): Promise<InstitutionSimpleDto> {
    return this.findAllInstitutionsSimple(FindAllOptions.SHOW_ALL, id).then(
      (value) => (value ? value[0] : null),
    );
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

    return this.findInstitutionById(institution.id);
  }

  private async _createInstitutionCountryBulk(
    entityManager: EntityManager,
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

    return entityManager.save(institutionLocation);
  }

  async createBulkInstitution(
    entityManager: EntityManager,
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
    institution = await entityManager.save(institution);
    await this._createInstitutionCountryBulk(
      entityManager,
      BulkInstitutions.country_id,
      institution.id,
      true,
      createBy,
    );

    return institution;
  }
}
