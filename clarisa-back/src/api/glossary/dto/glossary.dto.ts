import { ApiProperty } from '@nestjs/swagger';

export class GlossaryDto {
  @ApiProperty({
    description: 'The id of the glossary entry',
    type: String,
  })
  id: number;

  @ApiProperty({
    description: 'The term of the glossary entry',
    type: String,
  })
  term: string;

  @ApiProperty({
    description: 'The definition of the glossary entry',
    type: String,
  })
  definition: string;
}
