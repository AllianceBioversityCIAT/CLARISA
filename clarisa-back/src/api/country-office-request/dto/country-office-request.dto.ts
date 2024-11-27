import { ApiProperty } from '@nestjs/swagger';
import { CountryDto } from '../../country/dto/country.dto';
import { InstitutionDto } from '../../institution/dto/institution.dto';

export class CountryOfficeRequestDto {
  @ApiProperty({
    description: 'The id of the country office request',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'The institution linked to the country office request',
    type: InstitutionDto,
  })
  institutionDTO: InstitutionDto;

  @ApiProperty({
    description: 'The country of the country office request',
    type: CountryDto,
  })
  countryDTO: CountryDto;

  @ApiProperty({
    description: 'The status of the country office request',
    type: String,
  })
  requestStatus: string;

  @ApiProperty({
    description:
      'The justification for the rejection of the country office request',
    type: String,
    nullable: true,
  })
  requestJustification: string;

  @ApiProperty({
    description: 'The source of the country office request',
    type: String,
  })
  requestSource?: string;

  @ApiProperty({
    description:
      'The email of the user that created the country office request',
    type: String,
  })
  externalUserMail: string;

  @ApiProperty({
    description: 'The name of the user that created the country office request',
    type: String,
  })
  externalUserName: string;

  @ApiProperty({
    description:
      'The additional comments of the user that created the country office request',
    type: String,
  })
  externalUserComments: string;
}
