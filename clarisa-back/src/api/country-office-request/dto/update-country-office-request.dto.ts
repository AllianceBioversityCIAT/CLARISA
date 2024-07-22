import { OmitType } from '@nestjs/mapped-types';
import { IsNotEmpty, Min } from 'class-validator';
import { CreateCountryOfficeRequestDto } from './create-country-office-request.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCountryOfficeRequestDto extends OmitType(
  CreateCountryOfficeRequestDto,
  ['countryIso'],
) {
  @ApiProperty({
    description: 'The id of the country office request',
    type: Number,
    minimum: 1,
  })
  @Min(1)
  id: number;

  @ApiProperty({
    description:
      'The justification for the modification of the country office request',
    type: String,
  })
  @IsNotEmpty()
  modification_justification: string;

  @ApiProperty({
    description: 'The new country ISO Alpha-2 of the country office request',
    type: String,
  })
  countryIso: string;
}
