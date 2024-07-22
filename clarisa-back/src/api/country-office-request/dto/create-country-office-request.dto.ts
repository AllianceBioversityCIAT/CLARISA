import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Min } from 'class-validator';

export class CreateCountryOfficeRequestDto {
  @ApiProperty({
    description:
      'The code of the institution linked to the country office request',
    type: Number,
    minimum: 1,
  })
  @Min(1)
  institutionCode: number;

  @ApiProperty({
    description:
      'The ISO Alpha-2 code of the countries to be linked to the country office request',
    type: [String],
  })
  @IsNotEmpty({ each: true })
  countryIso: string[];

  @ApiProperty({
    description: 'The source of the country office request',
    type: String,
    nullable: true,
  })
  requestSource?: string;

  @ApiProperty({
    description:
      'The code of the institution linked to the country office request',
    type: String,
  })
  @IsNotEmpty()
  misAcronym: string;

  @ApiProperty({
    description: 'The code of the user linked to the country office request',
    type: String,
  })
  @Min(1)
  userId: number;

  @ApiProperty({
    description: 'The email of the user linked to the country office request',
    type: String,
  })
  @IsEmail()
  externalUserMail: string;

  @ApiProperty({
    description: 'The name of the user linked to the country office request',
    type: String,
  })
  externalUserName: string;

  @ApiProperty({
    description:
      'The additional comments of the user linked to the country office request',
    type: String,
  })
  externalUserComments: string;
}
