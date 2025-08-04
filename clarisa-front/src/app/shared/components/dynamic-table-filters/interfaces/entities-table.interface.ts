export interface EntitiesTableInterface {
  id: number;
  name: string;
  smo_code: string;
  level: number;
  portfolio: null;
  cgiar_entity_type: null;
  acronym: null | string;
  children: Child[];
}

interface Child {
  id: number;
  code: string;
  name: string;
  acronym: null;
  portfolio: string;
  cgiar_entity_type: Cgiarentitytype;
}

interface Cgiarentitytype {
  code: number;
  name: string;
}
