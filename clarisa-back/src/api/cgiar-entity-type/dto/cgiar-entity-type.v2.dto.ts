import { BasicDtoV2 } from '../../../shared/entities/dtos/basic-dto.v2';

export class CgiarEntityTypeDtoV2 extends BasicDtoV2 {
  prefix: string;
  parent: BasicDtoV2;
  definition: string;
  level: number;
  funding_source: BasicDtoV2;
  portfolio: BasicDtoV2;
}
