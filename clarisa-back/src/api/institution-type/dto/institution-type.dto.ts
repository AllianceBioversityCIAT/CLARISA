import { ApiProperty } from '@nestjs/swagger';

export class InstitutionTypeDto {
  @ApiProperty({
    description: 'The id of the institution type',
    type: Number,
    minimum: 1,
  })
  code: number;

  @ApiProperty({
    description: 'The name of the institution type',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The description of the institution type',
    type: String,
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    description: 'The parent of the institution type',
    type: InstitutionTypeDto,
    nullable: true,
  })
  parent?: InstitutionTypeDto;

  @ApiProperty({
    description: 'Is this institution type legacy?',
    type: Boolean,
    nullable: true,
  })
  legacy?: boolean;

  @ApiProperty({
    description: 'The id of the parent of the institution type',
    type: String,
    nullable: true,
  })
  id_parent?: number;
}
