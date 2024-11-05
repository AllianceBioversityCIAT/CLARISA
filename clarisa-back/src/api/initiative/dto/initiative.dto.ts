import { ApiProperty } from '@nestjs/swagger';
import { StageDto } from './stage.dto';

export class InitiativeDto {
  @ApiProperty({
    description: 'The id of the initiative',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'The initiative name',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The initiative short name',
    type: String,
  })
  short_name: string;

  @ApiProperty({
    description: 'The initiative official code',
    type: String,
  })
  official_code: string;

  @ApiProperty({
    description: 'Is the initiative active?',
    type: Boolean,
  })
  active: number;

  @ApiProperty({
    description: 'The initiative status',
    type: String,
    examples: ['Approved', 'Submitted', 'On hold', 'Editing'],
  })
  status: string;

  @ApiProperty({
    description: 'The initiative current stage id',
    type: Number,
  })
  stageId: number;

  @ApiProperty({
    description: 'The initiative current stage description',
    type: String,
  })
  description: string;

  @ApiProperty({
    description: 'The initiative action area id',
    type: Number,
  })
  action_area_id: number;

  @ApiProperty({
    description: 'The initiative action area description',
    type: String,
  })
  action_area_description: string;

  @ApiProperty({
    description: 'All initiative stages',
    type: [StageDto],
  })
  stages: StageDto[];

  @ApiProperty({
    description: 'The initiative type id',
    type: Number,
  })
  type_id: number;
}
