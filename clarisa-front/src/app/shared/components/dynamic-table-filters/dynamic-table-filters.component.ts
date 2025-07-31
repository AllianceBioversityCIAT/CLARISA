import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-dynamic-table-filters',
  templateUrl: './dynamic-table-filters.component.html',
  styleUrls: ['./dynamic-table-filters.component.scss']
})
export class DynamicTableFiltersComponent implements OnInit {
  @Input() dataList: any;

  constructor() {}

  ngOnInit(): void {
    console.log(this.dataList);
  }

  // getData() {
  //   this._manageApiService.getAnyEndpoint(this.informationPrint.route).subscribe(resp => {
  //     this.informationEndpoint = resp;
  //     this.loading = false;
  //   });
  // }
}
