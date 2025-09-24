import { BasicDto } from '../../../shared/entities/dtos/basic-dto';
import { GlobalUnitLineageRelationType } from '../entities/global-unit-lineage.entity';

export class GlobalUnitLineageDto {
  id: number;
  relation_type: GlobalUnitLineageRelationType;
  note?: string;
  from_global_unit_id: number;
  to_global_unit_id: number;
  from?: BasicDto;
  to?: BasicDto;
}
