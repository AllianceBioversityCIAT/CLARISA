import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { UrlParamsService } from '../../services/url-params.service';

@Injectable({
  providedIn: 'root',
})
export class EndpointsInformationService {
  urlApi = environment.apiUrl;
  endPointsInformation: any = [];
  endpointsFilterInformation: any;
  isLoaded: boolean = false;

  constructor(
    private http: HttpClient,
    public _servicesUrl: UrlParamsService
  ) {}

  getAllEndpoints() {
    return this.http
      .get(`${environment.apiUrl}api/hp-clarisa-category-endpoints`)
      .subscribe((resp: any) => {
        this.endPointsInformation = resp;

        this.endPointsInformation.find((x: any) => {
          if (
            x.name ===
            this._servicesUrl.getParams().nameCategory.split('_').join(' ')
          ) {
            this.endpointsFilterInformation = x;
          }
        });

        this.isLoaded = true;
      });
  }

  getAnyEndpoint(name: any) {
    return this.http.get(`${this.urlApi}${name}`);
  }
}
