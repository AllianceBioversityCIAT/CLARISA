import { GlobalUnitLineageRelationType } from '../entities/global-unit-lineage.entity';

export class GlobalUnitLineageUnitDto {
  code?: string;
  name?: string;
  compose_code?: string;
  year?: number;
}

export class GlobalUnitLineageDto {
  relation_type: GlobalUnitLineageRelationType;
  note?: string;
  from_global_unit_id?: GlobalUnitLineageUnitDto;
  to_global_unit_id?: GlobalUnitLineageUnitDto;
}
