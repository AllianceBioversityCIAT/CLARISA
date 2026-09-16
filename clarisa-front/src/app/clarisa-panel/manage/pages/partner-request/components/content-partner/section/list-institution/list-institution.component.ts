import { Component, OnInit } from '@angular/core';
import { EndpointsInformationService } from '../../../../../../../documentation/services/endpoints-information.service';

@Component({
  selector: 'app-list-institution',
  templateUrl: './list-institution.component.html',
  styleUrls: ['./list-institution.component.scss']
})
export class ListInstitutionComponent implements OnInit {
  /**
   * Campos que recorre el buscador global.
   *
   * La tabla ya no se arma desde un arreglo de columnas genérico: cada columna
   * se declara en la plantilla, que es donde se ve qué se está pintando. Esta
   * lista se queda porque `p-table` la necesita literal.
   */
  findColumns: string[] = ['code', 'acronym', 'name', 'institutionType.name', 'websiteLink'];
  loading: boolean = true;
  informationEndpoint: any;

  constructor(private _manageApiService: EndpointsInformationService) {}

  ngOnInit(): void {
    this._manageApiService.getAnyEndpoint('api/institutions').subscribe((resp) => {
      this.informationEndpoint = resp;
      this.loading = false;
    });
  }
}
