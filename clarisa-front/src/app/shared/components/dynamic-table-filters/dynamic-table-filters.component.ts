import { Component, Input, OnInit } from '@angular/core';
import { EntityFiltersService } from './entity-filters.service';

@Component({
  selector: 'app-dynamic-table-filters',
  templateUrl: './dynamic-table-filters.component.html',
  styleUrls: ['./dynamic-table-filters.component.scss']
})
export class DynamicTableFiltersComponent implements OnInit {
  @Input() dataList: any;
  selectedEntityType: any;
  selectedPortfolio: any;
  expandedRowKeys: { [s: string]: boolean } = {};

  constructor(public _entityFiltersService: EntityFiltersService) {}

  ngOnInit(): void {
    console.log('DataList:', this.dataList);
  }
  onChangeEntityType(event: any) {
    console.log(event);
  }
  onChangePortfolio(event: any) {
    console.log(event);
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
