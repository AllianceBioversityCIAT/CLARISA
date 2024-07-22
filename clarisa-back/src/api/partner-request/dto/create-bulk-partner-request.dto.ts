import { ApiProperty } from '@nestjs/swagger';
import { AuditableDto } from '../../../shared/entities/dtos/auditable-dto';

export class BulkPartnerRequestInstitution extends AuditableDto {
  @ApiProperty({
    description: 'The name of the partner',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The acronym of the partner',
    type: String,
  })
  acronym: string;

  @ApiProperty({
    description: 'The website of the partner',
    type: String,
  })
  website_link: string;

  @ApiProperty({
    description: 'The institution type of the partner',
    type: String,
  })
  institution_type: string;

  @ApiProperty({
    description: 'The country ISO Alpha-2 of the partner',
    type: String,
  })
  country: string;

  @ApiProperty({
    description: 'The status of the partner request',
    type: String,
  })
  status: string;

  @ApiProperty({
    description: 'The justification for the rejection of the partner request',
    type: String,
  })
  justification: string;
}
export class CreateBulkPartnerRequestDto {
  @ApiProperty({
    description: 'The id of the user that made the request',
    minimum: 1,
    type: Number,
  })
  externalUser: number;

  @ApiProperty({
    description: 'Was the request accepted? 1 for yes, 0 for no',
    type: Number,
  })
  accepted: number;

  @ApiProperty({
    description: 'The email of the external user that made the request',
    type: String,
  })
  externalUserEmail: string;

  @ApiProperty({
    description: 'The name of the external user that made the request',
    type: String,
  })
  externalUserName: string;

  @ApiProperty({
    description: 'The MIS acronym linked to the partner',
    type: String,
  })
  mis: number;

  @ApiProperty({
    description: 'The list of institutions to bulk upload',
    type: [BulkPartnerRequestInstitution],
  })
  listPartnerRequest: BulkPartnerRequestInstitution[];
}
