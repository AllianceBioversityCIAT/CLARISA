import { BasicDtoV2 } from '../../../shared/entities/dtos/basic-dto.v2';

export class FundingSourceDto extends BasicDtoV2 {
  type_term: string;
  funding_to: string;
}
