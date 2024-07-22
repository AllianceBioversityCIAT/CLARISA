import { ApiProperty } from '@nestjs/swagger';

export class GeographicScopeDto {
  @ApiProperty({
    description: 'The code of the geographic scope',
    type: Number,
    minimum: 1,
  })
  code: number;

  @ApiProperty({
    description: 'The name of the geographic scope',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The definition of the geographic scope',
    type: String,
  })
  definition: string;
}
