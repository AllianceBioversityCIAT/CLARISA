import { IsEmail, IsNotEmpty, Min } from 'class-validator';

export class CreatePartnerRequestDto {
  @IsNotEmpty()
  name: string;

  acronym: string;

  @Min(1)
  institutionTypeCode: number;

  @IsNotEmpty()
  hqCountryIso: string;

  websiteLink: string;

  requestSource?: string;

  @IsNotEmpty()
  misAcronym: string;

  @Min(1)
  userId: number;

  @IsEmail()
  externalUserMail: string;

  externalUserName: string;

  externalUserComments: string;

  category_1?: string;

  category_2?: string;

  platformUrl?: string;
}
