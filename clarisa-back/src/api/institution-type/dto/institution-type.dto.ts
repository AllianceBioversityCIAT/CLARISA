export class InstitutionTypeDto {
  code: number;
  name: string;
  description?: string;
  parent?: InstitutionTypeDto;
  legacy?: boolean;
  id_parent?: number;
}
