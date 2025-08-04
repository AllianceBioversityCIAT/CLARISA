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

  constructor(public _entityFiltersService: EntityFiltersService) {}

  ngOnInit(): void {
    console.log(this.dataList);
  }
}
