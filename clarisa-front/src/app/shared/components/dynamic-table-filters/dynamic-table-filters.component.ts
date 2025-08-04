import { Component, Input, OnInit } from '@angular/core';
import { EntityFiltersService } from './entity-filters.service';
import { EntitiesTableInterface } from './interfaces/entities-table.interface';
import { GetPortfoliosInterface } from './interfaces/get-portfolios.interface';
import { GetEntityTypeInterface } from './interfaces/get-entity-type.interface';

@Component({
  selector: 'app-dynamic-table-filters',
  templateUrl: './dynamic-table-filters.component.html',
  styleUrls: ['./dynamic-table-filters.component.scss']
})
export class DynamicTableFiltersComponent implements OnInit {
  @Input() dataList: EntitiesTableInterface[] = [];
  selectedEntityType: number | null = null;
  selectedPortfolio: number | null = null;
  searchText: string = '';
  expandedRowKeys: { [s: string]: boolean } = {};

  constructor(public _entityFiltersService: EntityFiltersService) {}

  ngOnInit(): void {
    console.log('DataList:', this.dataList);
  }
  onChangeEntityType(event: any) {
    this.selectedEntityType = event?.value || null;
    console.log('Selected Entity Type:', this.selectedEntityType);
  }

  onChangePortfolio(event: any) {
    this.selectedPortfolio = event?.value || null;
    console.log('Selected Portfolio:', this.selectedPortfolio);
  }

  onSearchChange(searchValue: string) {
    this.searchText = searchValue;
    console.log('Search Text:', this.searchText);
  }

  /**
   * Clears all applied filters and resets the component state
   * Maintains parent-child relationships in the data structure
   */
  clearFilters() {
    this.selectedEntityType = null;
    this.selectedPortfolio = null;
    this.searchText = '';
  }

  toggleRow(product: any) {
    console.log('Toggling row for product:', product);
    console.log('Current expandedRowKeys:', this.expandedRowKeys);

    if (this.expandedRowKeys[product.smo_code]) {
      delete this.expandedRowKeys[product.smo_code];
      console.log('Collapsing row');
    } else {
      this.expandedRowKeys[product.smo_code] = true;
      console.log('Expanding row');
    }

    console.log('Updated expandedRowKeys:', this.expandedRowKeys);
  }
}
