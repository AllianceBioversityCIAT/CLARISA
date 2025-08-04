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
    selectedEntityType: number | null
  ): EntitiesTableInterface[] {
    console.log(selectedPortfolio);

    let auxList = JSON.parse(JSON.stringify(list));
    if (searchText) {
      // auxList.map((item: EntitiesTableInterface) => {
      //   item.children = item.children.filter((child: Child) => {
      //     const childFullText = child.acronym + child.code + child.name;
      //     return this.textMatch(searchText, childFullText);
      //   });
      // });

      auxList = auxList.filter((item: EntitiesTableInterface) => {
        const parentFullText = item.acronym + item.smo_code + item.name;
        return this.textMatch(searchText, parentFullText) || item.children.length;
      });
    }

    if (selectedPortfolio) {
      auxList = auxList.filter((item: EntitiesTableInterface) => {
        return item.portfolio_id == selectedPortfolio;
      });
    }

    if (selectedEntityType) {
      // auxList.map((item: EntitiesTableInterface) => {
      //   item.children = item.children.filter((child: Child) => {
      //     return child.cgiar_entity_type.code == selectedEntityType;
      //   });
      // });
      auxList = auxList.filter((item: EntitiesTableInterface) => {
        return item.cgiar_entity_type.code == selectedEntityType;
      });
    }

    console.log(auxList);
    return auxList;
  }

  textMatch(searchText: string, text: string) {
    if (!searchText) return false;
    return text.toLowerCase().includes(searchText.toLowerCase());
  }
}
