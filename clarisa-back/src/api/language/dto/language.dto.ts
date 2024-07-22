import { OmitType } from '@nestjs/mapped-types';
import { BasicDtoV1 } from '../../../shared/entities/dtos/basic.v1.dto';
import { ApiProperty } from '@nestjs/swagger';

export class LanguageDto extends OmitType(BasicDtoV1, [
  'description',
] as const) {
  @ApiProperty({
    description: 'The ISO alpha-2 code of the language',
    type: String,
  })
  iso_alpha_2: string;

  @ApiProperty({
    description: 'The ISO alpha-3 code of the language',
    type: String,
  })
  iso_alpha_3: string;
}
