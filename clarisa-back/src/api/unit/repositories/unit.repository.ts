import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
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
    let whereClause: FindOptionsWhere<Unit> = {};
    const unitDtos: UnitDto[] = [];
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

    if (unitId) {
      whereClause.id = unitId;
    }

    const units: Unit[] = await this.find({
      where: whereClause,
    });

    await Promise.all(
      units.map(async (u) => {
        const unitDto: UnitDto = new UnitDto();
        unitDto.code = u.id;
        unitDto.description = u.description;
        unitDto.financialCode = u.financial_code;
        unitDto.parent = u.parent_id
          ? await this.createQueryBuilder('u')
              .select('u.id', 'code')
              .addSelect('u.description', 'description')
              .where('u.id = :unitId', { unitId: u.parent_id })
              .getRawOne()
          : null;

        unitDto.scienceGroup = u.science_group_id
          ? await this.createQueryBuilder('u')
              .select('sc.id', 'code')
              .addSelect('u.description', 'description')
              .leftJoin('u.science_group', 'sc')
              .where('u.id = :unitId', { unitId: u.id })
              .getRawOne()
          : null;

        unitDto.unitType = u.unit_type_id
          ? await this.createQueryBuilder('u')
              .select('ut.id', 'code')
              .addSelect('ut.acronym', 'acronym')
              .addSelect('ut.description', 'description')
              .leftJoin('u.unit_type', 'ut')
              .where('u.id = :unitId', { unitId: u.id })
              .getRawOne()
          : null;

        unitDtos.push(unitDto);
      }),
    );

    return unitDtos.sort((a, b) => a.code - b.code);
  }
}
