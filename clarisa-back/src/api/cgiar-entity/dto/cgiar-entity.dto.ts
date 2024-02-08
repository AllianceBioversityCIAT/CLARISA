import { CgiarEntityTypeDto } from '../../cgiar-entity-type/dto/cgiar-entity-type.dto';
import { FrameworkDto } from '../../framework/dto/framework.dto';

export class CgiarEntityDto {
  name: string;
  acronym: string;
  code: string;
  financial_code: string;
  institutionId: number;
  cgiarEntityTypeDTO: CgiarEntityTypeDto;
  frameworkDTO: FrameworkDto;
  parent?: CgiarEntityDto;
  children?: CgiarEntityDto[];
}
