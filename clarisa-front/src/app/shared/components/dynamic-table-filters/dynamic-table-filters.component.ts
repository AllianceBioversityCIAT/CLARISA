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

  // Filters - using IDs for API compatibility
  selectedEntityType: number | null = null; // Filters by cgiar_entity_type.name
  selectedPortfolio: number | null = null; // Filters by portfolio_id
  searchText: string = ''; // Searches in name, code, acronym, entity_type, portfolio (both parent and children)

  // Expansion state for hierarchical table
  expandedRowKeys: { [s: string]: boolean } = {};

  constructor(public _entityFiltersService: EntityFiltersService) {}

  ngOnInit(): void {
    // Component initialized
  }
  onChangeEntityType(event: any) {
    this.selectedEntityType = event?.value || null;
  }

  onChangePortfolio(event: any) {
    this.selectedPortfolio = event?.value || null;
  }

  onSearchChange(searchValue: string) {
    this.searchText = searchValue;
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
    if (this.expandedRowKeys[product.smo_code]) {
      delete this.expandedRowKeys[product.smo_code];
    } else {
      this.expandedRowKeys[product.smo_code] = true;
    }
  }
}
