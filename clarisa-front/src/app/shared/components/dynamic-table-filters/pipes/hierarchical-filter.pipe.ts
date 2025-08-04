import { Pipe, PipeTransform } from '@angular/core';
import { EntitiesTableInterface } from '../interfaces/entities-table.interface';

// Interface para los hijos, extraída de la interface principal
interface Child {
  id: number;
  code: string;
  name: string;
  acronym: null; // Always null according to the interface
  portfolio_id: number;
  portfolio: string;
  cgiar_entity_type: {
    code: number;
    name: string;
  };
}

@Pipe({
  name: 'hierarchicalFilter',
  pure: true
})
export class HierarchicalFilterPipe implements PipeTransform {
  transform(
    list: EntitiesTableInterface[],
    searchText: string,
    selectedPortfolio: number | null,
    selectedEntityType: string | null
  ): EntitiesTableInterface[] {
    if (!searchText) return list;
    let auxList = JSON.parse(JSON.stringify(list));
    auxList.map((item: EntitiesTableInterface) => {
      item.children = item.children.filter((child: Child) => {
        const childFullText = child.acronym + child.code + child.name;
        return childFullText.toLowerCase().includes(searchText.toLowerCase());
      });
    });

    auxList = auxList.filter((item: EntitiesTableInterface) => {
      const parentFullText = item.acronym + item.smo_code + item.name;
      return parentFullText.toLowerCase().includes(searchText.toLowerCase()) || item.children.length;
    });

    console.log(auxList);
    return auxList;
  }
}
