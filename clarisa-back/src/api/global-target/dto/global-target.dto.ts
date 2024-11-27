import { ApiProperty } from '@nestjs/swagger';

export class GlobalTargetDto {
  @ApiProperty({
    description: 'The id of the global target',
    type: Number,
    minimum: 1,
  })
  targetId: number;

  @ApiProperty({
    description: 'The SMO code of the global target',
    type: String,
  })
  smo_code: string;

  @ApiProperty({
    description: 'The global target itself',
    type: String,
  })
  target: string;

  @ApiProperty({
    description: 'The id of the impact area linked to the global target',
    type: Number,
    minimum: 1,
  })
  impactAreaId: number;

  @ApiProperty({
    description: 'The name of the impact area linked to the global target',
    type: String,
  })
  impactAreaName: string;
}
