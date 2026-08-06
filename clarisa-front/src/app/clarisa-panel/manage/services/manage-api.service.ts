import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

export interface CreateApiKeyBody {
  name: string;
  environment: string;
  mis_id?: number;
  scopes?: string[];
  allowed_ips?: string[];
  expires_at?: string;
}

export interface CreateMisBody {
  name: string;
  acronym: string;
  contact_point_id: number;
  environment: string;
}

export interface UsageQueryParams {
  from?: string;
  to?: string;
  mis_id?: number;
  api_key_id?: number;
  microservice_name?: string;
  granularity?: 'day' | 'week';
  limit?: number;
  offset?: number;
}

export interface UsageSummary {
  period: { from: string; to: string };
  totals: {
    total_requests: number;
    error_count: number;
    avg_response_time_ms: number | null;
    active_keys: number;
    revoked_keys: number;
    expiring_within_30_days: number;
  };
  by_mis: {
    mis_id: number | null;
    mis_acronym: string;
    mis_name: string;
    environment: string | null;
    total_requests: number;
    api_key_count: number;
    microservices_used: number;
  }[];
  by_mis_microservice: {
    mis_id: number | null;
    mis_acronym: string;
    mis_name: string;
    environment: string | null;
    microservice_name: string;
    total_requests: number;
  }[];
  by_microservice: {
    microservice_name: string;
    total_requests: number;
    unique_api_keys: number;
    percentage: number;
  }[];
  keys: {
    id: number;
    name: string;
    key_prefix: string;
    mis_acronym: string | null;
    mis_name: string | null;
    environment: string | null;
    usage_count: number;
    last_used_at: string | null;
    requests_in_period: number;
    is_active: boolean;
    expires_at: string | null;
  }[];
  time_series: {
    date: string;
    count: number;
    avg_response_time_ms: number | null;
  }[];
}

export interface ApiKeyUsageStats {
  period: { from: string; to: string };
  api_key: {
    id: number;
    name: string;
    key_prefix: string;
    mis_acronym: string | null;
    mis_name: string | null;
    environment: string | null;
    is_active: boolean;
    expires_at: string | null;
  };
  totals: {
    total_requests: number;
    error_count: number;
    avg_response_time_ms: number | null;
    active_days: number;
  };
  time_series: UsageSummary['time_series'];
  by_microservice: {
    label: string;
    total_requests: number;
    percentage: number;
  }[];
  top_endpoints: {
    label: string;
    total_requests: number;
    percentage: number;
  }[];
}

export interface UsageLogsPage {
  period: { from: string; to: string };
  total: number;
  items: {
    id: number;
    api_key_id: number;
    api_key_name: string;
    key_prefix: string;
    mis_acronym: string | null;
    microservice_name: string;
    endpoint_accessed: string;
    http_method: string | null;
    status_code: number | null;
    ip_address: string | null;
    response_time_ms: number | null;
    created_at: string;
  }[];
}

export interface GlossaryPortfolioRef {
  id: number;
  name: string;
  acronym: string;
}

export interface GlossaryAdminTerm {
  id: number;
  term: string;
  definition: string;
  is_active: boolean;
  show_in_dashboard: boolean;
  application_name: string | null;
  portfolios: GlossaryPortfolioRef[];
}

export interface CreateGlossaryTermBody {
  term: string;
  definition: string;
  portfolio_ids?: number[];
  show_in_dashboard?: boolean;
}

export type UpdateGlossaryTermBody = Partial<CreateGlossaryTermBody>;

export type GlossaryBulkConflictPolicy = 'skip' | 'update';

export type GlossaryBulkRowAction = 'create' | 'update' | 'reactivate' | 'skip' | 'invalid';

export interface GlossaryBulkRow {
  term: string;
  definition: string;
  portfolio_ids?: number[];
}

export interface GlossaryBulkBody {
  rows: GlossaryBulkRow[];
  portfolio_ids?: number[];
  on_conflict?: GlossaryBulkConflictPolicy;
  show_in_dashboard?: boolean;
}

export interface GlossaryBulkRowResult {
  index: number;
  term: string;
  definition: string;
  action: GlossaryBulkRowAction;
  glossary_id: number | null;
  current_definition?: string;
  portfolios: GlossaryPortfolioRef[];
  message?: string;
}

export interface GlossaryBulkResult {
  summary: {
    total: number;
    to_create: number;
    to_update: number;
    to_reactivate: number;
    skipped: number;
    invalid: number;
  };
  applied: boolean;
  rows: GlossaryBulkRowResult[];
}

@Injectable({
  providedIn: 'root'
})
export class ManageApiService {
  urlApi = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getAllUser() {
    return this.http.get(`${this.urlApi}api/users`);
  }

  getAllPartnerRequest() {
    return this.http.get(`${this.urlApi}api/partner-requests`);
  }

  getAllTypeInstitutions() {
    return this.http.get(`${this.urlApi}api/institution-types/from-parent`);
  }

  getAllCountries() {
    return this.http.get(`${this.urlApi}api/countries`);
  }

  postNewRequestIntitution(bodyRequest): Observable<any> {
    return this.http.post(`${this.urlApi}api/partner-requests/create`, bodyRequest);
  }

  postAceptedOrRejectRequest(bodyRequest): Observable<any> {
    return this.http.post(`${this.urlApi}api/partner-requests/respond`, bodyRequest);
  }

  getByIdTypeInstitution(id) {
    return this.http.get(`${this.urlApi}api/institution-types/get/${id}`);
  }

  patchPartnerRequest(bodyRequest): Observable<any> {
    return this.http.patch(`${this.urlApi}api/partner-requests/update`, bodyRequest);
  }
  postCreateBulkInstitution(bodyRequest) {
    return this.http.post(`${this.urlApi}api/partner-requests/create-bulk`, bodyRequest);
  }
  getAllMis(show?: 'active' | 'all' | 'inactive') {
    const params = show && show !== 'active' ? { show } : {};
    return this.http.get(`${this.urlApi}api/mises`, { params });
  }

  getAllPortfolios() {
    return this.http.get(`${this.urlApi}api/portfolios?show=all`);
  }

  getAllCgiarEntityTypology() {
    return this.http.get(`${this.urlApi}api/cgiar-entity-typology`);
  }

  getAllEnvironments() {
    return this.http.get(`${this.urlApi}api/environments`);
  }

  getAllApiKeys(show: 'active' | 'all' | 'inactive' = 'active') {
    return this.http.get(`${this.urlApi}api/api-keys`, { params: { show } });
  }

  getApiKeyScopes() {
    return this.http.get(`${this.urlApi}api/api-keys/scopes`);
  }

  getApiKeyById(id: number) {
    return this.http.get(`${this.urlApi}api/api-keys/get/${id}`);
  }

  createApiKey(body: CreateApiKeyBody) {
    return this.http.post(`${this.urlApi}api/api-keys/create`, body);
  }

  revokeApiKey(id: number) {
    return this.http.patch(`${this.urlApi}api/api-keys/${id}/revoke`, {});
  }

  rotateApiKey(id: number) {
    return this.http.patch(`${this.urlApi}api/api-keys/${id}/rotate`, {});
  }

  deleteApiKey(id: number) {
    return this.http.delete(`${this.urlApi}api/api-keys/${id}`);
  }

  createMis(body: CreateMisBody) {
    return this.http.post(`${this.urlApi}api/mises/create`, body);
  }

  getApiKeyUsageSummary(params: UsageQueryParams = {}) {
    return this.http.get<UsageSummary>(`${this.urlApi}api/api-keys/usage/summary`, {
      params: this.cleanParams(params)
    });
  }

  getApiKeyUsage(id: number, params: UsageQueryParams = {}) {
    const { api_key_id, mis_id, ...keyUsageParams } = params;
    return this.http.get<ApiKeyUsageStats>(`${this.urlApi}api/api-keys/${id}/usage`, { params: this.cleanParams(keyUsageParams) });
  }

  getApiKeyUsageLogs(params: UsageQueryParams = {}) {
    return this.http.get<UsageLogsPage>(`${this.urlApi}api/api-keys/usage/logs`, {
      params: this.cleanParams(params)
    });
  }

  // ------------------------------------------------------------- Glossary

  getGlossaryTerms(show: 'active' | 'all' | 'inactive' = 'all') {
    return this.http.get<GlossaryAdminTerm[]>(`${this.urlApi}api/glossary/admin/terms`, { params: { show } });
  }

  createGlossaryTerm(body: CreateGlossaryTermBody) {
    return this.http.post<GlossaryAdminTerm>(`${this.urlApi}api/glossary/admin/terms`, body);
  }

  updateGlossaryTerm(id: number, body: UpdateGlossaryTermBody) {
    return this.http.patch<GlossaryAdminTerm>(`${this.urlApi}api/glossary/admin/terms/${id}`, body);
  }

  setGlossaryTermStatus(id: number, isActive: boolean) {
    return this.http.patch<GlossaryAdminTerm>(`${this.urlApi}api/glossary/admin/terms/${id}/status`, { is_active: isActive });
  }

  previewGlossaryBulk(body: GlossaryBulkBody) {
    return this.http.post<GlossaryBulkResult>(`${this.urlApi}api/glossary/admin/bulk/preview`, body);
  }

  importGlossaryBulk(body: GlossaryBulkBody) {
    return this.http.post<GlossaryBulkResult>(`${this.urlApi}api/glossary/admin/bulk/import`, body);
  }

  private cleanParams(params: UsageQueryParams): Record<string, string | number> {
    const out: Record<string, string | number> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        out[key] = value as string | number;
      }
    });
    return out;
  }
}
