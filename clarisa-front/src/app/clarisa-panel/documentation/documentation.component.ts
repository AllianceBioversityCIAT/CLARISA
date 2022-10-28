import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UrlParamsService } from '../services/url-params.service';
import { endpointsInfo } from './metadata/endpoints-information';
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
  constructor(
    private routeActive: ActivatedRoute,
    private _manageApiService: EndpointsInformationService,
    public _servicesUrl: UrlParamsService
  ) {}

  ngOnInit(): void {
    this.routeActive.params.subscribe((resp) => {
      this._servicesUrl.updateParams(resp);
    });
    this.endPointsInformation = endpointsInfo;
    this.endPointsInformation.find((x: any) => {
      if (
        x.name ==
        this._servicesUrl.getParams().nameCategory.split('_').join(' ')
      ) {
        this.endpointsFilterInformation = x;
      }
    });
  }
}
