import { AuditableDto } from '../../../shared/entities/dtos/auditable-dto';

export class BulkPartnerRequestDto {
  externalUser: number;
  accepted: number;
  externalUserEmail: string;
  externalUserName: string;
  mis: number;
  listPartnerRequest: BulkPartnerRequestInstitution[];
}

export class BulkPartnerRequestInstitution extends AuditableDto {
  name: string;
  acronym: string;
  website_link: string;
  institution_type: string;
  country: string;
  status: string;
  justification: string;
}
