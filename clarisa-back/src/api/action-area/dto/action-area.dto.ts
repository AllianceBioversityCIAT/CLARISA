import { ApiProperty } from '@nestjs/swagger';

export class ActionAreaDto {
  @ApiProperty({
    description: 'The id of the action area',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'The name of the action area',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The description of the action area',
    type: String,
  })
  description: string;

  @ApiProperty({
    description: 'The icon of the action area',
    type: String,
  })
  icon: string;

  @ApiProperty({
    description: 'The color of the action area',
    type: String,
  })
  color: string;
}
