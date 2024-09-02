export class PhaseRiskDto {
  id: number;
  name: string;
  reporting_year: number;
  start_date: string;
  end_date: string;
  status: string;
  active: boolean;
  previous_phase?: PhaseRiskDto;
}
