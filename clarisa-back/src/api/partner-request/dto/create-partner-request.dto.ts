import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Min } from 'class-validator';

export class CreatePartnerRequestDto {
  @ApiProperty({
    description: 'The name of the partner',
    type: String,
    required: true,
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The acronym of the partner',
    type: String,
    required: false,
  })
  acronym: string;

  @ApiProperty({
    description: 'The insitution type code of the partner',
    type: Number,
    minimum: 1,
    required: true,
  })
  @Min(1)
  institutionTypeCode: number;

  @ApiProperty({
    description: `The country ISO Alpha-2 code of the partner's HQ`,
    type: String,
    required: true,
  })
  @IsNotEmpty()
  hqCountryIso: string;

  @ApiProperty({
    description: 'The website of the partner',
    type: String,
    required: false,
  })
  websiteLink: string;

  @ApiProperty({
    description: 'The source of the partner request',
    type: String,
    required: false,
  })
  requestSource?: string;

  @ApiProperty({
    description: 'The MIS acronym linked to the partner',
    type: String,
    required: true,
  })
  @IsNotEmpty()
  misAcronym: string;

  @ApiProperty({
    description: `The id of the MIS' user that made the request`,
    type: Number,
    minimum: 1,
    required: true,
  })
  @Min(1)
  userId: number;

  @ApiProperty({
    description: 'The email of the external user that made the request',
    type: String,
    required: true,
  })
  @IsEmail()
  externalUserMail: string;

  @ApiProperty({
    description: 'The name of the external user that made the request',
    type: String,
    required: true,
  })
  externalUserName: string;

  @ApiProperty({
    description: 'The comments of the external user that made the request',
    type: String,
    required: false,
  })
  externalUserComments: string;

  @ApiProperty({
    description: 'The category 1 of the partner',
    type: String,
    required: false,
  })
  category_1?: string;

  @ApiProperty({
    description: 'The category 2 of the partner',
    type: String,
    required: false,
  })
  category_2?: string;
}
