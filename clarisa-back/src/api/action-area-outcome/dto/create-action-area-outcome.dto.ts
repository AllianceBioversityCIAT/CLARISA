import { AuditableDto } from '../../../shared/entities/dtos/auditable-dto';

export class CreateActionAreaOutcomeDto extends AuditableDto {
  smo_code: string;

  outcome_statement: string;
}
