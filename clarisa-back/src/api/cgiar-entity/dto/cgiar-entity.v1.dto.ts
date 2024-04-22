import { BasicDto } from '../../../shared/entities/dtos/basic-dto';

export class CgiarEntityDtoV1 extends BasicDto {
  acronym: string;
  financial_code: string;
  institutionId: number;
  cgiarEntityTypeDTO: BasicDto;
}
