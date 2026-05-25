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

        // Inject the W3/bilateral projects endpoint under "General Control List".
        // The backend does not yet expose this in hp-clarisa-category-endpoints,
        // so we add it client-side to surface GET api/projects in the docs.
        this.injectProjectsEndpoint();

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

  private injectProjectsEndpoint(): void {
    if (!Array.isArray(this.endPointsInformation)) return;

    const controlList = this.endPointsInformation.find(
      (c: any) => c?.name === 'One CGIAR Control List'
    );
    const generalControlList = controlList?.subcategories?.find(
      (s: any) => s?.name === 'General Control List'
    );
    if (!generalControlList || !Array.isArray(generalControlList.endpoints))
      return;

    const alreadyThere = generalControlList.endpoints.some(
      (e: any) => e?.route === 'api/projects'
    );
    if (alreadyThere) return;

    generalControlList.endpoints.push(this.buildProjectsEndpoint());
  }

  private buildProjectsEndpoint(): any {
    const field = (
      type: string,
      column_name: string,
      order: number | null,
      show_in_table = true
    ) => ({
      type,
      order,
      properties: null,
      column_name,
      object_type: 'field',
      show_in_table,
      display_method: 'inherit',
    });

    return {
      id: 900001,
      name: 'Projects',
      description:
        'This list contains the W3 and bilateral projects registered in CLARISA, including their lead organization, funding source, timeframe and budget. Each project also carries its mapping to CGIAR programs/global units.',
      route: 'api/projects',
      http_method: 'GET',
      request_json: null,
      response_json: {
        type: 'response',
        order: null,
        properties: {
          id: field('number', 'ID', 0),
          full_name: field('string', 'Full Name', 1),
          short_name: field('string', 'Short Name', null, false),
          summary: field('string', 'Summary', null, false),
          source_of_funding: field('string', 'Source of Funding', 2),
          start_date: field('string', 'Start Date', 3),
          end_date: field('string', 'End Date', 4),
          total_budget: field('number', 'Total Budget', 5),
          lead_institution_object: {
            type: 'lead_institution_object',
            order: 6,
            properties: {
              name: field('string', 'Name', 0),
              acronym: field('string', 'Acronym', 1),
            },
            column_name: 'Lead Organization',
            object_type: 'object',
            show_in_table: true,
            display_method: 'concat',
          },
        },
        column_name: null,
        object_type: 'list',
        show_in_table: true,
        display_method: 'column',
      },
    };
  }

  getAnyEndpoint(name: any) {
    return this.http.get(`${this.urlApi}${name}`);
  }
}
