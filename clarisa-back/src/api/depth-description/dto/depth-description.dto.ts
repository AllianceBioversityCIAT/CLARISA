import { ApiProperty } from '@nestjs/swagger';

export class DepthDescriptionDto {
  @ApiProperty({
    description: 'The id of the depth description',
    type: Number,
    minimum: 1,
  })
  depthScaleId: number;

  @ApiProperty({
    description: 'The name of the depth description',
    type: String,
  })
  depthScaleName: string;
}
