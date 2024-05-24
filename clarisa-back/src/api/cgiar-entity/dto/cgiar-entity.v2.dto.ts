import { BasicDtoV2 } from '../../../shared/entities/dtos/basic-dto.v2';

export class CgiarEntityDtoV2 extends BasicDtoV2 {
  short_name: string;
  acronym: string;
  entity_type: BasicDtoV2;
  parent: BasicDtoV2;
  portfolio: BasicDtoV2;
  start_date: string;
  end_date: string;
  level: number;
}
