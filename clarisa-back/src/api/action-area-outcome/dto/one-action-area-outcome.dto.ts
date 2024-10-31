import { ApiProperty, OmitType } from '@nestjs/swagger';
import { BasicDtoV1 } from '../../../shared/entities/dtos/basic.v1.dto';

export class OneActionAreaOutcomeDto extends OmitType(BasicDtoV1, [
  'name',
  'description',
] as const) {
  @ApiProperty({
    type: String,
    description: 'The SMO code of the action area outcome',
  })
  smo_code: string;

  @ApiProperty({
    type: String,
    description: 'The statement of the action area outcome',
  })
  outcome_statement: string;
}
