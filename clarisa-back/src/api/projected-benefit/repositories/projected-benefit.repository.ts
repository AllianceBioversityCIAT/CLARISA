import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { ProjectedBenefit } from '../entities/projected-benefit.entity';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { ProjectedBenefitDto } from '../dto/projected-benefit.dto';

@Injectable()
export class ProjectedBenefitRepository extends Repository<ProjectedBenefit> {
  constructor(private dataSource: DataSource) {
    super(ProjectedBenefit, dataSource.createEntityManager());
  }

  async findProjectedBenefits(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    projectedBenefitId?: number,
  ): Promise<ProjectedBenefitDto[]> {
    let whereClause = '';
    if (option !== FindAllOptions.SHOW_ALL) {
      whereClause = `where pb.is_active = 
        ${option === FindAllOptions.SHOW_ONLY_ACTIVE}`;
    }

    if (projectedBenefitId) {
      if (whereClause) {
        whereClause += ` and pb.id = ${projectedBenefitId}`;
      } else {
        whereClause = `where pb.id = ${projectedBenefitId}`;
      }
    }

    const query = `
      select
        pb.id projectedBenefitId,
        ia.id impactAreaId,
          ia.name impactAreaName,
          iai.id impactAreaIndicator,
          iai.indicator_statement impactAreaIndicatorName,
          iai.is_aplicable_projected_benefits isAplicableProjectedBenefits,
          iai.target_unit targetUnit,
          iai.target_year targetYear,
          iai.target_value value,
          (
            select json_arrayagg(json_object(
              "depthScaleId", dd.id,
              "depthScaleName", dd.name
            ))
            from projected_benefit_depths pbd 
            left join depth_descriptions dd on pbd.depth_description_id = dd.id
            where pbd.projected_benefit_id = pb.id
          ) depthScales,
          (
            select json_arrayagg(json_object(
              "descriptionID", pbwd.id,
              "description", pbwd.description,
              "weightValue", pbw.weight_value
            ))
            from projected_benefit_weightings pbw 
            left join projected_benefit_weight_descriptions pbwd on pbw.weight_description_id = pbwd.id
            where pbw.projected_benefits_id = pb.id
          ) weightingValues
      from projected_benefits pb
      left join impact_area_indicators iai on pb.impact_area_indicator_id = iai.id 
      left join impact_areas ia on iai.impact_areas_id = ia.id
      ${whereClause}
      order by pb.id
    `;

    return this.query(query) as Promise<ProjectedBenefitDto[]>;
  }
}
