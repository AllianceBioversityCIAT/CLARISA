import { ApiProperty } from '@nestjs/swagger';
import { InstitutionTypeDto } from '../../institution-type/dto/institution-type.dto';
import { InstitutionCountryDto } from './institution-country.dto';

export class InstitutionDto {
  @ApiProperty({
    description: 'The id of the institution',
    minimum: 1,
    type: Number,
  })
  code: number;

  @ApiProperty({
    description: 'The name of the institution',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The acronym of the institution',
    type: String,
    nullable: true,
  })
  acronym: string;

  @ApiProperty({
    description: 'The link of the website of the institution',
    type: String,
    nullable: true,
  })
  websiteLink: string;

  @ApiProperty({
    description: 'The date whe the institution was added',
    type: Date,
  })
  added: Date;

  @ApiProperty({
    description: 'The type of the institution',
    type: InstitutionTypeDto,
  })
  institutionType: InstitutionTypeDto;

  @ApiProperty({
    description: 'The country offices linked to the institution',
    type: [InstitutionCountryDto],
  })
  countryOfficeDTO: InstitutionCountryDto[];

  @ApiProperty({
    description: 'Is the institution active?',
    type: Boolean,
  })
  is_active?: boolean;
}
