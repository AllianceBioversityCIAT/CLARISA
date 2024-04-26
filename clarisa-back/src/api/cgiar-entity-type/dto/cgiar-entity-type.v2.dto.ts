import { BasicDto } from '../../../shared/entities/dtos/basic-dto';

export class CgiarEntityTypeDtoV2 extends BasicDto {
  prefix: string;
  parent: BasicDto;
  definition: string;
  level: number;
  funding_source: BasicDto;
  portfolio: BasicDto;
}
