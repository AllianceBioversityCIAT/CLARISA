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
    console.log('ExpandedRowKeys:', this.expandedRowKeys);

    // Datos de ejemplo para testing si no hay dataList
    if (!this.dataList || this.dataList.length === 0) {
      this.dataList = [
        {
          smo_code: 'CGR001',
          name: 'CGIAR Research Program Example 1',
          category: 'CRP1',
          quantity: 'Global',
          cgiar_entity_type: 'Research Program'
        },
        {
          smo_code: 'CGR002',
          name: 'CGIAR Research Program Example 2',
          category: 'CRP2',
          quantity: 'Regional',
          cgiar_entity_type: 'Platform'
        },
        {
          smo_code: 'CGR003',
          name: 'CGIAR Research Program Example 3',
          category: 'CRP3',
          quantity: 'National',
          cgiar_entity_type: 'Center'
        }
      ];
      console.log('Using dummy data:', this.dataList);
    }
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
