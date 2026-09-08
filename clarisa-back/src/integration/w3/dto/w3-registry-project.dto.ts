export interface W3RegistryCountryDto {
  name: string;
  isoAlpha2: string;
  allocationPercentage: number;
}

export interface W3RegistryMappingDto {
  programCode: string;
  programName: string;
  efficiencyRating: 'low' | 'medium' | 'high';
  allocationPercentage: number;
  complementarityRating: 'low' | 'medium' | 'high';
  /** Estado del mapping en el W3 Registry. Valor observado: 'agreed'. */
  status?: string;
}

export interface W3RegistryProjectDto {
  id: number;
  createdAt: string;
  updatedAt: string;
  snapshotId: number;
  sourceProjectId: number;
  code: string;
  name: string;
  description: string | null;
  centerName: string | null;
  centerAcronym: string | null;
  countries: W3RegistryCountryDto[];
  totalBudget: string;
  fundingSource: string | null;
  funder: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  mappings: W3RegistryMappingDto[];
}

export interface W3RegistryProjectsPageDto {
  data: W3RegistryProjectDto[];
  total: number;
  page: number;
  limit: number;
}
