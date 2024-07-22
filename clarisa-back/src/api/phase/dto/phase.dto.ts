import { ApiProperty } from '@nestjs/swagger';

export class PhaseDto {
  @ApiProperty({
    description: 'The id of the phase',
    minimum: 1,
    type: Number,
  })
  phaseId: string;

  @ApiProperty({
    description: 'The name of the phase',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The year of the phase',
    minimum: 1,
    type: Number,
  })
  year: number;

  @ApiProperty({
    description: 'The status of the phase',
    type: String,
  })
  status: string;

  @ApiProperty({
    description: 'Is the phase active?',
    type: Boolean,
  })
  active: boolean;

  @ApiProperty({
    description: 'The application of which the phase belongs to',
    type: String,
    required: false,
  })
  application?: string;
}
