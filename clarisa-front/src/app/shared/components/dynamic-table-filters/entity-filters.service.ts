import { Injectable } from '@angular/core';
import { ManageApiService } from '../../../clarisa-panel/manage/services/manage-api.service';
import { GetEntityTypeInterface } from './interfaces/get-entity-type.interface';
import { GetPortfoliosInterface } from './interfaces/get-portfolios.interface';

@Injectable({
  providedIn: 'root'
})
export class EntityFiltersService {
  portfolios: GetPortfoliosInterface[] = [];
  cgiarEntityTypology: GetEntityTypeInterface[] = [];
  constructor(private _apiService: ManageApiService) {
    this.getPortfolios();
    this.getCgiarEntityTypology();
  }
  getPortfolios() {
    this._apiService.getAllPortfolios().subscribe((resp: any) => {
      console.log(resp);
      this.portfolios = resp;
    });
  }

  getCgiarEntityTypology() {
    this._apiService.getAllCgiarEntityTypology().subscribe((resp: any) => {
      console.log(resp);
      this.cgiarEntityTypology = resp;
    });
  }
}
