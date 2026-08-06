export class InstitutionSimpleDto {
  code: number;
  name: string;
  acronym: string;
  websiteLink: string;
  institutionTypeId: number;
  institutionType: string;
  hqLocation: string;
  hqLocationISOalpha2: string;
  institutionRelatedList: any;

  // validity period. `endDate` null means the institution is still valid and
  // consumable; a date means it must no longer be used.
  startDate: string;
  endDate: string;
  validityStatus: string;
}
