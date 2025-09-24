import { BasicDto } from '../../../shared/entities/dtos/basic-dto';
import { GlobalUnitLineageDto } from './global-unit-lineage.dto';

export class CgiarEntityDtoV2 extends BasicDto {
  id: number;
  short_name: string;
  acronym: string;
  entity_type: BasicDto;
  parent: BasicDto;
  portfolio: BasicDto;
  start_date: string;
  end_date: string;
  level: number;
  year?: number;
  incoming_lineages?: GlobalUnitLineageDto[];
  outgoing_lineages?: GlobalUnitLineageDto[];
}
