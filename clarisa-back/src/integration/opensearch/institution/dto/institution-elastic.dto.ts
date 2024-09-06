import { InstitutionDto } from '../../../../api/institution/dto/institution.dto';

export class InstitutionElasticDto extends InstitutionDto {
  score!: number;
}
