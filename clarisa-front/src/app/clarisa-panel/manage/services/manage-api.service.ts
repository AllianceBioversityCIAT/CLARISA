import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

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
  getAllMis() {
    return this.http.get(`${this.urlApi}api/mises`);
  }

  getAllPortfolios() {
    return this.http.get(`${this.urlApi}api/portfolios?show=all`);
  }

  getAllCgiarEntityTypology() {
    return this.http.get(`${this.urlApi}api/cgiar-entity-typology`);
  }
}
