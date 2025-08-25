export interface EntitiesTableInterface {
  id: number;
  name: string;
  smo_code: string;
  level: number;
  portfolio_id: number;
  portfolio: string;
  cgiar_entity_type: Cgiarentitytype;
  acronym: null | string;
  children: Child[];
  full_text: string;
}

interface Child {
  id: number;
  code: string;
  name: string;
  acronym: null;
  portfolio_id: number;
  portfolio: string;
  cgiar_entity_type: Cgiarentitytype;
}

interface Cgiarentitytype {
  code: number;
  name: string;
}
