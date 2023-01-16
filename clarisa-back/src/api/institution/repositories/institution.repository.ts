import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
import { InstitutionSourceDto } from '../../institution-dictionary/dto/institution-source.dto';
import { InstitutionTypeDto } from '../../institution-type/dto/institution-type.dto';
import { PartnerRequest } from '../../partner-request/entities/partner-request.entity';
import { CreateInstitutionBulkDto } from '../dto/institution-bulk.dto';
import { InstitutionCountryDto } from '../dto/institution-country.dto';
import { InstitutionSimpleDto } from '../dto/institution-simple.dto';
import { InstitutionDto } from '../dto/institution.dto';
import { InstitutionLocation } from '../entities/institution-location.entity';
import { Institution } from '../entities/institution.entity';
import { InstitutionType } from '../../institution-type/entities/institution-type.entity';
import { Country } from '../../country/entities/country.entity';

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
    @InjectRepository(InstitutionLocation)
    private institutionLocationRepository: Repository<InstitutionLocation>,
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
          is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
        };
        break;
    }

    if (from) {
      whereClause = {
        ...whereClause,
        updated_at: MoreThanOrEqual(new Date(+from)),
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
    const institutionDtos: InstitutionSimpleDto[] = [];
    let whereClause: FindOptionsWhere<Institution> = {};
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
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
    showActiveField: boolean = false,
  ): InstitutionDto {
    const institutionDto: InstitutionDto = new InstitutionDto();

    institutionDto.code = institution.id;
    institutionDto.name = institution.name;
    institutionDto.acronym = institution.acronym;
    institutionDto.websiteLink = institution.website_link;
    institutionDto.added = institution.created_at;
    if (showActiveField) {
      institutionDto.is_active = institution.is_active;
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
    const institutionDictionaryDtos: InstitutionDictionaryDto[] = [];
    let whereClause: FindOptionsWhere<Institution> = {};
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
        };
        break;
    }

    const institution: Institution[] = await this.find({
      where: whereClause,
      relations: {
        institution_type_object: true,
        institution_locations: {
          country_object: true,
        },
        institution_dictionary_entries: {
          source_object: true,
        },
      },
    });

    await Promise.all(
      institution.map(async (i) => {
        const institutionDictionaryDto: InstitutionDictionaryDto =
          new InstitutionDictionaryDto();

        institutionDictionaryDto.code = i.id;
        institutionDictionaryDto.name = i.name;
        institutionDictionaryDto.acronym = i.acronym;
        institutionDictionaryDto.websiteLink = i.website_link;
        institutionDictionaryDto.institutionType =
          i.institution_type_object.name;
        institutionDictionaryDto.institutionTypeId =
          i.institution_type_object.id;

        const hq: InstitutionLocation = i.institution_locations.find(
          (il) => il.is_headquater,
        );
        institutionDictionaryDto.hqLocation = hq.country_object.name;
        institutionDictionaryDto.hqLocationISOalpha2 =
          hq.country_object.iso_alpha_2;

        institutionDictionaryDto.institutionRelatedList =
          i.institution_dictionary_entries
            .map((id) => {
              const institution_dictionary_dto: InstitutionSourceDto =
                new InstitutionSourceDto();

              institution_dictionary_dto.institutionCode =
                id.institution_source_id;
              institution_dictionary_dto.institutionName =
                id.institution_source_name;
              institution_dictionary_dto.source = id.source_object.name;

              return institution_dictionary_dto;
            })
            .sort((id1, id2) =>
              id1.institutionCode.localeCompare(id2.institutionCode),
            );

        institutionDictionaryDtos.push(institutionDictionaryDto);
      }),
    );

    return institutionDictionaryDtos;
  }

  async createInstitutionCountry(
    request: CountryOfficeRequest | PartnerRequest,
    isHQ: boolean,
  ): Promise<InstitutionLocation> {
    let institutionLocation: InstitutionLocation = new InstitutionLocation();

    institutionLocation.country_id = request.country_id;
    institutionLocation.created_at = request.accepted_date;
    institutionLocation.created_by = request.accepted_by;
    institutionLocation.institution_id = request.institution_id;
    institutionLocation.is_headquater = isHQ;

    return this.institutionLocationRepository.save(institutionLocation);
  }

  async createInstitution(
    partnerRequest: PartnerRequest,
  ): Promise<InstitutionDto> {
    let institution: Institution = new Institution();

    institution.acronym = partnerRequest.acronym;
    institution.created_at = partnerRequest.accepted_date;
    institution.created_by = partnerRequest.accepted_by;
    institution.institution_type_id = partnerRequest.institution_type_id;
    institution.name = partnerRequest.partner_name;
    institution.website_link = partnerRequest.web_page;

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
    countryAndInstitution: CreateInstitutionBulkDto,
    id_institution: number,
    isHQ: boolean,
  ) {
    let institutionLocation: InstitutionLocation = new InstitutionLocation();
    let countryInstitution: Country;
    countryInstitution = await this.query(
      `SELECT id from countries i where i.iso_alpha_2 like '%${countryAndInstitution.country}%';`,
    );
    institutionLocation.country_id = countryInstitution[0].id;
    institutionLocation.is_headquater = isHQ;
    institutionLocation.institution_id = id_institution;
    institutionLocation.created_by = 3043;

    return this.institutionLocationRepository.save(institutionLocation);
  }

  async createBulkInstitution(
    BulkInstitutions: CreateInstitutionBulkDto,
    createBy: number,
  ) {
    let institutionType: InstitutionType;

    let institution: Institution = new Institution();
    institution.acronym = BulkInstitutions.acronym;
    institution.name = BulkInstitutions.name;
    institution.website_link = BulkInstitutions.website_link;

    institutionType = await this.query(
      `SELECT * from institution_types i where i.name like '%${BulkInstitutions.institution_type}%' and source_id = 1;`,
    );

    institution.institution_type_id = institutionType[0].id;
    institution.created_by = createBy;
    institution = await this.save(institution);
    await this.createInstitutionCountryBulk(
      BulkInstitutions,
      institution.id,
      true,
    );

    return institution;
  }
}
