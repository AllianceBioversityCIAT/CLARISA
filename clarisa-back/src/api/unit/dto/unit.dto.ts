import { BasicDtoV2 } from '../../../shared/entities/dtos/basic-dto.v2';
import { UnitTypeDto } from './unit-type.dto';

export class UnitDto {
  code: number;
  description: string;
  financialCode: string;
  unitType: UnitTypeDto;
  scienceGroup: BasicDtoV2;
  parent: BasicDtoV2;
}
