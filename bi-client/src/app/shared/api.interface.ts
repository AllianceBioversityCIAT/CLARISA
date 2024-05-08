import { Params } from '@angular/router';

export interface GetBiReports {
  id: number;
  report_name: string;
  report_title: string;
  report_description: null | string;
  report_id: string;
  dataset_id: string;
  group_id: string;
  is_active: boolean;
  has_rls_security: boolean;
  has_full_screen: boolean;
  report_order: number;
  queryParams: Params;
}

export interface Resp<T> {
  response: T[];
}

export interface GetBiReport {
  token: string;
  azureValidation: number;
  filters: BiFilter[];
  report: Report;
}

interface Report {
  id: number;
  report_name: string;
  report_title: string;
  report_description: string;
  report_id: string;
  dataset_id: string;
  group_id: string;
  is_active: number;
  has_rls_security: number;
  report_order: number;
  has_full_screen: number;
  embed_url: string;
  mainPage: string;
}

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
