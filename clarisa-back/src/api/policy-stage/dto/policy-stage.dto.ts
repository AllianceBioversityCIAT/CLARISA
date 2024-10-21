import { BasicDtoV1 } from '../../../shared/entities/dtos/basic.v1.dto';
import { ApiProperty, OmitType } from '@nestjs/swagger';

export class PolicyStageDto extends OmitType(BasicDtoV1, [
  'description',
] as const) {
  @ApiProperty({
    description: 'The definition of the policy stage',
    type: String,
  })
  definition: string;
}
