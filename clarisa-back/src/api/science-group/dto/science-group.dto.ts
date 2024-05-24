import { BasicDtoV2 } from '../../../shared/entities/dtos/basic-dto.v2';

export class ScienceGroupDto extends BasicDtoV2 {
  financialCode: string;
  parent: BasicDtoV2;
}
