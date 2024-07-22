import { ApiProperty } from '@nestjs/swagger';

export class EOI {
  @ApiProperty({
    description: 'The id of the ToC dashboard result',
    type: String,
  })
  toc_result_id: string;

  @ApiProperty({
    description: 'The short title of the EoI Outcome',
    type: String,
  })
  short_title: string;

  @ApiProperty({
    description: 'The statement of the EoI Outcome',
    type: String,
  })
  outcome_statement: string;
}

export class InitiativeEoiOstDto {
  @ApiProperty({
    description: 'The id of the initiative',
    type: Number,
    minimum: 1,
  })
  initiative_id: number;

  @ApiProperty({
    description: 'The official code of the initiative',
    type: String,
  })
  initiative_official_code: string;

  @ApiProperty({
    description: 'The name of the initiative',
    type: String,
  })
  initiative_name: string;

  @ApiProperty({
    description: 'The current stage name of the initiative',
    type: String,
  })
  stage_name: string;

  @ApiProperty({
    description: 'The list of end of initiative outcomes',
    type: [EOI],
  })
  eoi_o: EOI[];
}

export type InitiativeEoiResponse = {
  eoi_outcome_by_initiatives: InitiativeEoiOstDto[];
};
