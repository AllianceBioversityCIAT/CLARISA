import { Injectable } from '@nestjs/common/decorators';
import {
  DataSource,
  FindOptionsWhere,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { InstitutionTypeDto } from '../../institution-type/dto/institution-type.dto';
import { InstitutionTypeRepository } from '../../institution-type/repositories/institution-type.repository';
import { InstitutionCountryDto } from '../../institution/dto/institution-country.dto';
import { InstitutionSimpleDto } from '../../institution/dto/institution-simple.dto';
import { InstitutionDto } from '../../institution/dto/institution.dto';
import { InstitutionLocation } from '../../institution/entities/institution-location.entity';
import { InstitutionLocationRepository } from '../../institution/repositories/institution-location.repository';
import { OldInstitution } from '../entities/old-institution.entity';

@Injectable()
export class OldInstitutionRepository extends Repository<OldInstitution> {
  constructor(
    private dataSource: DataSource,
    private institutionLocationRepository: InstitutionLocationRepository,
    private institutionTypeRepository: InstitutionTypeRepository,
  ) {
    super(OldInstitution, dataSource.createEntityManager());
  }

  async findAllInstitutions(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    from: string = undefined,
  ): Promise<InstitutionDto[]> {
    const institutionDtos: InstitutionDto[] = [];
    let whereClause: FindOptionsWhere<OldInstitution> = {};

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

    const institutions: OldInstitution[] = await this.find({
      where: whereClause,
    });

    await Promise.all(
      institutions.map(async (i) => {
        i.institution_locations = await this.institutionLocationRepository.find(
          {
            where: {
              auditableFields: { is_active: true },
              institution_id: i.id,
            },
            relations: {
              country_object: true,
            },
          },
        );

        i.institution_type_object =
          await this.institutionTypeRepository.findOneBy({
            id: i.institution_type_id,
          });

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
    let whereClause: FindOptionsWhere<OldInstitution> = {};
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

    const institutions: OldInstitution[] = await this.find({
      where: whereClause,
    });

    return await Promise.all(
      institutions.map(async (i) => {
        i.institution_locations = await this.institutionLocationRepository.find(
          {
            where: {
              auditableFields: { is_active: true },
              institution_id: i.id,
            },
            relations: {
              country_object: true,
            },
          },
        );

        i.institution_type_object =
          await this.institutionTypeRepository.findOneBy({
            id: i.institution_type_id,
          });
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
      }),
    );
  }

  private fillOutInstitutionInfo(
    oldInstitution: OldInstitution,
    showActiveField = false,
  ): InstitutionDto {
    const institutionDto: InstitutionDto = new InstitutionDto();

    institutionDto.code = oldInstitution.id;
    institutionDto.name = oldInstitution.name;
    institutionDto.acronym = oldInstitution.acronym;
    institutionDto.websiteLink = oldInstitution.website_link;
    institutionDto.added = oldInstitution.auditableFields.created_at;
    if (showActiveField) {
      institutionDto.is_active = oldInstitution.auditableFields.is_active;
    }

    institutionDto.countryOfficeDTO = oldInstitution.institution_locations.map(
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
      oldInstitution.institution_type_object.id;
    institutionDto.institutionType.name =
      oldInstitution.institution_type_object.name;

    return institutionDto;
  }
}
