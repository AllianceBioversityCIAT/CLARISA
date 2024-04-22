import { BasicDto } from '../../../shared/entities/dtos/basic-dto';

export class FundingSourceDto extends BasicDto {
  type_term: string;
  funding_to: string;
}
