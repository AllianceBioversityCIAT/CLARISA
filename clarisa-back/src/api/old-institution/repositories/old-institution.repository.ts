import { Injectable } from '@nestjs/common/decorators';
import { DataSource, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { InstitutionSimpleDto } from '../../institution/dto/institution-simple.dto';
import { InstitutionDto } from '../../institution/dto/institution.dto';
import { OldInstitution } from '../entities/old-institution.entity';

@Injectable()
export class OldInstitutionRepository extends Repository<OldInstitution> {
  constructor(private readonly dataSource: DataSource) {
    super(OldInstitution, dataSource.createEntityManager());
  }

  async findAllInstitutions(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    from: string = undefined,
  ): Promise<InstitutionDto[]> {
    let institutionDtos: InstitutionDto[] = [];

    try {
      const query = `
        select oi.id as code, oi.name, oi.acronym, oi.website_link as websiteLink, oi.created_at as added, oi.is_active,
          (
            select json_arrayagg(json_object(
              "code", c_q1.id,
              "isHeadquarter", il_q1.is_headquater,
              "isoAlpha2", c_q1.iso_alpha_2,
              "name", c_q1.name,
              "regionDTO", null
            ))
            from institution_locations il_q1
            left join countries c_q1 on il_q1.country_id = c_q1.id
            where il_q1.institution_id = oi.id and il_q1.is_active
            group by il_q1.institution_id
          ) as countryOfficeDTO,
          (
            select json_object(
              "code", it_q1.id,
              "name", it_q1.name
            )
            from institution_types it_q1
            where it_q1.is_active and oi.institution_type_id = it_q1.id
          ) as institutionType
        from old_institutions oi
        where oi.updated_at >= ? and oi.is_active in (?)
      `;

      institutionDtos = await this.query(query, [
        from ?? 0,
        option === FindAllOptions.SHOW_ALL
          ? '1,0'
          : option === FindAllOptions.SHOW_ONLY_ACTIVE
          ? '1'
          : '0',
      ]);

      institutionDtos.forEach((i) => {
        i.name, i.countryOfficeDTO, i.countryOfficeDTO, i.institutionType.code;
      });

      return institutionDtos;
    } catch (error) {
      console.log(error);
      throw Error('Error fetching old institutions');
    }
  }

  async findAllInstitutionsSimple(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<InstitutionSimpleDto[]> {
    let oldInstitutions: InstitutionSimpleDto[] = [];
    try {
      const query = `
        select oi.id as code, oi.acronym, c.name as hqLocation, c.iso_alpha_2 as hqLocationISOalpha2,
          it.name as institutionType, it.id as institutionTypeId, oi.name, oi.website_link as websiteLink
        from old_institutions oi
        left join institution_locations il on il.institution_id = oi.id and il.is_active and il.is_headquater 
        left join countries c on il.country_id = c.id
        left join institution_types it on oi.institution_type_id = it.id
        where oi.is_active in (?)
      `;

      oldInstitutions = await this.dataSource.query(query, [
        option === FindAllOptions.SHOW_ALL
          ? '1,0'
          : option === FindAllOptions.SHOW_ONLY_ACTIVE
          ? '1'
          : '0',
      ]);

      return oldInstitutions;
    } catch (error) {
      console.log(error);
      throw Error('Error fetching simple old institutions');
    }
  }
}
