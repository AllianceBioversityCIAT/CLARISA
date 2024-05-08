export interface BiFilter {
  id: number;
  variablename: string;
  scope: string;
  table: string;
  column: string;
  operator: string;
  param_type: string;
  report_id: number;
}
