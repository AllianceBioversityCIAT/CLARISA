import { Pipe, PipeTransform } from '@angular/core';
import { EntitiesTableInterface } from '../interfaces/entities-table.interface';

@Pipe({
  name: 'hierarchicalFilter',
  pure: true
})
export class HierarchicalFilterPipe implements PipeTransform {
  transform(
    items: EntitiesTableInterface[],
    searchText: string,
    selectedPortfolio: number | null,
    selectedEntityType: number | null
  ): EntitiesTableInterface[] {
    if (!items) {
      return items;
    }

    // Si no hay filtros aplicados, retorna todos los elementos
    if ((!searchText || searchText.trim() === '') && selectedPortfolio === null && selectedEntityType === null) {
      return items;
    }

    const lowerSearchText = searchText?.toLowerCase().trim() || '';

    return items.filter(item => {
      // Verificar si el padre coincide con los filtros
      const parentMatches = this.itemMatches(item, lowerSearchText, selectedPortfolio, selectedEntityType);

      // Verificar si algún hijo coincide con los filtros
      const childMatches = item.children?.some(child => this.childMatches(child, lowerSearchText, selectedPortfolio, selectedEntityType)) || false;

      // Mostrar el elemento si el padre o algún hijo coincide
      return parentMatches || childMatches;
    });
  }

  private itemMatches(
    item: EntitiesTableInterface,
    searchText: string,
    selectedPortfolio: number | null,
    selectedEntityType: number | null
  ): boolean {
    // Filtro de búsqueda de texto
    let textMatch = true;
    if (searchText) {
      const name = item.name?.toLowerCase() || '';
      const code = item.smo_code?.toLowerCase() || '';
      const acronym = item.acronym?.toLowerCase() || '';
      const entityType = item.cgiar_entity_type?.name?.toLowerCase() || '';

      textMatch = name.includes(searchText) || code.includes(searchText) || acronym.includes(searchText) || entityType.includes(searchText);
    }

    // Filtro de portfolio
    let portfolioMatch = true;
    if (selectedPortfolio !== null) {
      portfolioMatch = item.portfolio_id === selectedPortfolio;
    }

    // Filtro de entity type
    let entityTypeMatch = true;
    if (selectedEntityType !== null) {
      entityTypeMatch = item.cgiar_entity_type?.code === selectedEntityType;
    }

    return textMatch && portfolioMatch && entityTypeMatch;
  }

  private childMatches(child: any, searchText: string, selectedPortfolio: number | null, selectedEntityType: number | null): boolean {
    // Para children, solo aplicamos filtro de texto por ahora
    // Los filtros de portfolio y entity type se mantienen en el nivel padre
    let textMatch = true;
    if (searchText) {
      const name = child.name?.toLowerCase() || '';
      const code = child.code?.toLowerCase() || '';
      const acronym = child.acronym?.toLowerCase() || '';
      const entityType = child.cgiar_entity_type?.name?.toLowerCase() || '';

      textMatch = name.includes(searchText) || code.includes(searchText) || acronym.includes(searchText) || entityType.includes(searchText);
    }

    return textMatch;
  }
}
