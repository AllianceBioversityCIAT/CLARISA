export class InstitutionTypeFromParentDto {
  code: string;
  name: string;
  description?: string;
  children: InstitutionTypeFromParentDto[];
}
