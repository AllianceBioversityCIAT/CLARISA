import { ApiProperty } from '@nestjs/swagger';
import { CountryDto } from '../../country/dto/country.dto';
import { InstitutionTypeDto } from '../../institution-type/dto/institution-type.dto';
import { InstitutionDto } from '../../institution/dto/institution.dto';

export class PartnerRequestDto {
  @ApiProperty({
    description: 'The id of the partner request',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'The name of the partner',
    type: String,
  })
  partnerName: string;

  @ApiProperty({
    description: 'The acronym of the partner',
    type: String,
  })
  acronym: string;

  @ApiProperty({
    description: 'The website of the partner',
    type: String,
  })
  webPage: string;

  @ApiProperty({
    description: 'The MIS linked this partner request',
    type: String,
  })
  mis: string;

  @ApiProperty({
    description: 'The status of the partner request',
    type: String,
  })
  requestStatus: string;

  @ApiProperty({
    description: 'The justification for the rejection of the partner request',
    type: String,
  })
  requestJustification: string;

  @ApiProperty({
    description: 'The source of the partner request',
    type: String,
  })
  requestSource?: string;

  @ApiProperty({
    description: 'The email of the external user that made the request',
    type: String,
  })
  externalUserMail: string;

  @ApiProperty({
    description: 'The name of the external user that made the request',
    type: String,
  })
  externalUserName: string;

  @ApiProperty({
    description:
      'The additional comments of the external user that made the request',
    type: String,
  })
  externalUserComments: string;

  @ApiProperty({
    description: 'The country of the partner',
    type: CountryDto,
  })
  countryDTO: CountryDto;

  @ApiProperty({
    description: 'The type of the institution',
    type: InstitutionTypeDto,
  })
  institutionTypeDTO: InstitutionTypeDto;

  @ApiProperty({
    description: 'The institution linked to the partner request',
    type: InstitutionDto,
  })
  institutionDTO: InstitutionDto;

  @ApiProperty({
    description: 'The category #1 of the partner request',
    type: String,
  })
  category_1: string;

  @ApiProperty({
    description: 'The category #2 of the partner request',
    type: String,
  })
  category_2: string;

  @ApiProperty({
    description: 'The date when the partner request was created',
    type: Date,
  })
  created_at: Date;
}
