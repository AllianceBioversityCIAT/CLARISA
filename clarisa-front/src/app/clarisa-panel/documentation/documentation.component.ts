import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UrlParamsService } from '../services/url-params.service';
import { EndpointsInformationService } from './services/endpoints-information.service';

@Component({
  selector: 'app-documentation',
  templateUrl: './documentation.component.html',
  styleUrls: ['./documentation.component.scss'],
})
export class DocumentationComponent implements OnInit {
  endPointsInformation: any = [];
  endpointsFilterInformation: any;
  categoriaSelection: any;
  informationEndpoint: any;
  contador: any;
  cont: any;
  isLoaded: boolean = false;

  constructor(
    private routeActive: ActivatedRoute,
    public _manageApiService: EndpointsInformationService,
    public _servicesUrl: UrlParamsService
  ) {}

  ngOnInit(): void {
    this.routeActive.params.subscribe((resp) => {
      this._servicesUrl.updateParams(resp);
    });
    this._manageApiService.getAllEndpoints();
  }
}
