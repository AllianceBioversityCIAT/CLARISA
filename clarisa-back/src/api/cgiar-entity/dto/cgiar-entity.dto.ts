import { CgiarEntityTypeDto } from '../../cgiar-entity-type/dto/cgiar-entity-type.dto';

export class CgiarEntityDto {
  name: string;
  acronym: string;
  code: string;
  financial_code: string;
  institutionId: number;
  cgiarEntityTypeDTO: CgiarEntityTypeDto;
  parent?: CgiarEntityDto;
  children?: CgiarEntityDto[];
}
