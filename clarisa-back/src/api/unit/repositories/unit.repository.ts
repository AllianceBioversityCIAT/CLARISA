import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { UnitDto } from '../dto/unit.dto';
import { Unit } from '../entities/unit.entity';

@Injectable()
export class UnitRepository extends Repository<Unit> {
  constructor(private dataSource: DataSource) {
    super(Unit, dataSource.createEntityManager());
  }

  async findUnits(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    unitId?: number,
  ): Promise<UnitDto[]> {
    let whereClause: string = '';
    if (option !== FindAllOptions.SHOW_ALL) {
      whereClause = `where is_active = ${option === FindAllOptions.SHOW_ONLY_ACTIVE}`;
    }

    if (unitId) {
      whereClause += `${whereClause ? ' and' : 'where'} id = ${unitId}`;
    }

    const query = `
      select u.id as code, u.description, u.financial_code as financialCode,
        if(u.parent_id is null, null, json_object(
          "code", u_parent.id,
          "description", u_parent.description
        )) as parent,
        if(u.science_group_id is null, null, json_object(
          "code", sg.id,
          "description", sg.description
        )) as scienceGroup,
        if(u.unit_type_id is null, null, json_object(
          "code", ut.id,
          "acronym", ut.acronym,
          "description", ut.description
        )) as unitType
      from units u
      left join units u_parent on u.parent_id = u_parent.id
      left join science_groups sg on u.science_group_id = sg.id
      left join unit_types ut on u.unit_type_id = ut.id
      ${whereClause}
      order by u.id 
    `;

    return this.dataSource.query(query).catch((error) => {
      throw Error(`Error while fetching units: ${error}`);
    });
  }

  async findUnitById(id: number): Promise<UnitDto> {
    return this.findUnits(FindAllOptions.SHOW_ALL, id).then((units) => {
      if (!units?.length) {
        throw Error();
      }

      return units[0];
    });
  }
}
