import { BasicDtoV2 } from '../../../shared/entities/dtos/basic-dto.v2';

export class CgiarEntityDtoV1 extends BasicDtoV2 {
  acronym: string;
  financial_code: string;
  institutionId: number;
  cgiarEntityTypeDTO: BasicDtoV2;
}
