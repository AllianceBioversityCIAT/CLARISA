import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { EntityFiltersService } from './entity-filters.service';
import { EntitiesTableInterface } from './interfaces/entities-table.interface';
import * as FileSaver from 'file-saver';
import { Table } from 'primeng/table';

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
  @ViewChild('dt') dt!: Table;


  // Expansion state for hierarchical table
  expandedRowKeys: { [s: string]: boolean } = {};

  constructor(public _entityFiltersService: EntityFiltersService) {}

  ngOnInit(): void {
    // Component initialized
  }
  onChangeEntityType(event: any) {
    this.selectedEntityType = event?.value || null;
    this.dt?.reset();
  }

  onChangePortfolio(event: any) {
    this.selectedPortfolio = event?.value || null;
    this.dt?.reset();

  }


  onSearchChange(searchValue: string) {
     this.searchText = searchValue;
     this.dt?.reset();
  }

  /**
   * Clears all applied filters and resets the component state
   * Maintains parent-child relationships in the data structure
   */
  clearFilters() {
    this.selectedEntityType = null;
    this.selectedPortfolio = null;
    this.searchText = '';
    this.dt?.reset();
  }

  toggleRow(product: any) {
    if (this.expandedRowKeys[product.smo_code]) {
      delete this.expandedRowKeys[product.smo_code];
    } else {
      this.expandedRowKeys[product.smo_code] = true;
    }
  }

  /**
   * Exports filtered data to Excel format
   * Includes both parent and child entities in separate rows
   */
  exportExcel() {
    import('xlsx').then(xlsx => {
      const worksheet = xlsx.utils.json_to_sheet(this.exportInformation());
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, {
        bookType: 'xlsx',
        type: 'array'
      });
      this.saveAsExcelFile(excelBuffer, 'CLARISA_CGIAR_Entities_');
    });
  }

  /**
   * Saves the Excel file with a timestamped filename
   */
  saveAsExcelFile(buffer: any, fileName: string): void {
    const date = new Date();
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });

    const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;

    FileSaver.saveAs(data, `${fileName}${timestamp}${EXCEL_EXTENSION}`);
  }

  /**
   * Prepares filtered data for export
   * Returns array of objects representing both parent and child entities
   */
  private exportInformation(): any[] {
    // Get filtered data using the same pipe as the table
    const filteredData = this.getFilteredData();
    const exportData: any[] = [];

    filteredData.forEach(parent => {
      // Add parent entity
      exportData.push({
        Type: 'Parent',
        Code: parent.smo_code,
        Name: parent.name,
        Acronym: parent.acronym || 'N/A',
        Portfolio: parent?.portfolio ?? 'N/A',
        'Entity Type Code': parent?.cgiar_entity_type?.code ?? 'N/A',
        'Entity Type Name': parent?.cgiar_entity_type?.name ?? 'N/A',
        Level: parent.level
      });

      // Add child entities if they exist
      if (parent.children && parent.children.length > 0) {
        parent.children.forEach(child => {
          exportData.push({
            Type: 'Child',
            Code: child.code,
            Name: child.name,
            Acronym: child?.acronym ?? 'N/A',
            Portfolio: child?.portfolio ?? 'N/A',
            'Entity Type Code': child?.cgiar_entity_type?.code ?? 'N/A',
            'Entity Type Name': child?.cgiar_entity_type?.name ?? 'N/A',
            Level: 'Child of ' + parent.smo_code
          });
        });
      }
    });

    return exportData;
  }

  /**
   * Gets filtered data using the same logic as the hierarchical filter pipe
   */
  private getFilteredData(): EntitiesTableInterface[] {
    let auxList = JSON.parse(JSON.stringify(this.dataList));

    // Apply search filter
    if (this.searchText) {
      auxList = auxList.filter((item: EntitiesTableInterface) => {
        const parentFullText = item.acronym + item.smo_code + item.name;
        return this.textMatch(this.searchText, parentFullText);
      });
    }

    // Apply portfolio filter
    if (this.selectedPortfolio) {
      auxList = auxList.filter((item: EntitiesTableInterface) => {
        return item.portfolio_id == this.selectedPortfolio;
      });
    }

    // Apply entity type filter
    if (this.selectedEntityType) {
      auxList = auxList.filter((item: EntitiesTableInterface) => {
        return item.cgiar_entity_type.code == this.selectedEntityType;
      });
    }

    return auxList;
  }

  /**
   * Text matching utility function (replicated from pipe)
   */
  private textMatch(searchText: string, text: string): boolean {
    if (!searchText) return false;
    return text.toLowerCase().includes(searchText.toLowerCase());
  }
}
