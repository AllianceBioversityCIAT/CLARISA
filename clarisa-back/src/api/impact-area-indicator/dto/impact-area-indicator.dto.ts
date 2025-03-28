import { Portfolio } from '../../portfolio/entities/portfolio.entity';

export class ImpactAreaIndicatorDto {
  indicatorId: number;
  indicatorStatement: string;
  impactAreaId: number;
  impactAreaName: string;
  targetYear: number;
  targetUnit: string;
  value: string;
  isAplicableProjectedBenefits: boolean;
  portfolioId?: number;
  portfolio?: Partial<Portfolio>;
  parentId?: number;
  parent?: Partial<ImpactAreaIndicatorDto>;
  level?: number;
}
