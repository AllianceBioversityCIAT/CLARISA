import { AuditableDto } from '../../../shared/entities/dtos/auditable-dto';

export class CreateInstitutionTypeDto extends AuditableDto {
  name: string;

  acronym: string;

  description: string;

  source_id: number;

  parent_id: number;
}
