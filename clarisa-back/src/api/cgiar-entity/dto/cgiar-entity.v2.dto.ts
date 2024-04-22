import { BasicDto } from '../../../shared/entities/dtos/basic-dto';

export class CgiarEntityDtoV2 extends BasicDto {
  short_name: string;
  acronym: string;
  entity_type: BasicDto;
  parent: BasicDto;
  portfolio: BasicDto;
  start_date: number;
  end_date: number;
  level: number;
}
