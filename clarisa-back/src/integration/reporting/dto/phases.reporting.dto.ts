export class PhaseReportingDto {
  is_active: boolean;
  created_date: string;
  last_updated_date: string;
  created_by?: string;
  last_updated_by: any;
  id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  toc_pahse_id: string;
  cgspace_year: number;
  phase_year: number;
  status: boolean;
  previous_phase?: string;
  app_module_id: string;
  obj_previous_phase?: PhaseReportingDto;
  can_be_deleted: boolean;
}
