import { WorkpackageCountryOstDto } from './workpackage-country.ost.dto';
import { WorkpackageRegionOstDto } from './workpackage-region.ost.dto';

export class WorkpackageOstDto {
  initiative_id: number;
  init_official_code: string;
  stage_id: number;
  wp_id: number;
  wp_official_code: number;
  active: number;
  name: string;
  results: string;
  pathway_content: string;
  is_global: number;
  initvStgId: number;
  created_at: Date;
  updated_at: Date;
  acronym: string;
  initiative_status: number;
  regions: WorkpackageRegionOstDto[];
  countries: WorkpackageCountryOstDto[];
}

export type WorkpackageResponse = {
  workpackages: WorkpackageOstDto[];
};
