import { ApiProperty } from '@nestjs/swagger';

export class InstitutionTypeFromParentDto {
  @ApiProperty({
    description: 'The id of the parent institution type',
    type: Number,
    minimum: 1,
  })
  code: string;

  @ApiProperty({
    description: 'The name of the parent institution type',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The description of the parent institution type',
    type: String,
  })
  description?: string;

  @ApiProperty({
    description: 'The children of this institution type',
    type: () => [InstitutionTypeFromParentDto],
    nullable: true,
  })
  children: InstitutionTypeFromParentDto[];
}
