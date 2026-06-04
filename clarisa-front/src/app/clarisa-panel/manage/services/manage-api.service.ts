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
}
