import { BasicDtoV2 } from '../../../shared/entities/dtos/basic.v2.dto';

export class ScienceGroupDto extends BasicDtoV2 {
  financialCode: string;
  parent: BasicDtoV2;
}
