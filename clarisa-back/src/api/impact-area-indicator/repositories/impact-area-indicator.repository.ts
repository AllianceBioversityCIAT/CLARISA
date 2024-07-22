import { ImpactAreaIndicator } from '../entities/impact-area-indicator.entity';
import { ImpactAreaIndicatorDto } from '../dto/impact-area-indicator.dto';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';

@Injectable()
export class ImpactAreaIndicatorRepository extends Repository<ImpactAreaIndicator> {
  constructor(private dataSource: DataSource) {
    super(ImpactAreaIndicator, dataSource.createEntityManager());
  }

  public findAllImpactAreaIndicators(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ImpactAreaIndicatorDto[]> {
    return this._findImpactAreaIndicators(option);
  }

  public findOneImpactAreaById(id: number): Promise<ImpactAreaIndicatorDto> {
    return this._findImpactAreaIndicators(
      FindAllOptions.SHOW_ONLY_ACTIVE,
      id,
    ).then((ias) => {
      return ias.length === 1 ? ias[0] : null;
    });
  }

  private _findImpactAreaIndicators(
    option = FindAllOptions.SHOW_ONLY_ACTIVE,
    impactAreaId?: number,
  ): Promise<ImpactAreaIndicatorDto[]> {
    const isActive = option === FindAllOptions.SHOW_ONLY_ACTIVE;
    const query = `
      select 
        ia.id impactAreaId,
        ia.name impactAreaName,
        iai.id indicatorId,
        iai.indicator_statement indicatorStatement,
        iai.is_aplicable_projected_benefits isAplicableProjectedBenefits,
        iai.target_unit targetUnit,
        iai.target_year targetYear,
        iai.target_value value
      from impact_area_indicators iai
      left join impact_areas ia on iai.impact_areas_id = ia.id
      ${
        option === FindAllOptions.SHOW_ALL
          ? ''
          : `
        where iai.is_active = ${isActive} and ia.is_active = ${isActive}
        `
      }
      ${impactAreaId ? (option !== FindAllOptions.SHOW_ALL ? `and iai.id = ${impactAreaId}` : `where ia.id = ${impactAreaId}`) : ''}
      order by ia.id, iai.id;
    `;

    return this.query(query) as Promise<ImpactAreaIndicatorDto[]>;
  }
}
