import { ApiProperty } from '@nestjs/swagger';

export class GeopositionDto {
  @ApiProperty({
    description: 'The id of the geo-object',
    type: Number,
    minimum: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The latitude of the geo-object',
    type: Number,
  })
  latitude: number;

  @ApiProperty({
    description: 'The longitude of the geo-object',
    type: Number,
  })
  longitude: number;
}
