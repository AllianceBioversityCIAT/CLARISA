/**
 * Allowlist de endpoints PUBLICOS que se exponen en la documentacion OpenAPI
 * (/api-docs y /api-docs-json).
 *
 * CLARISA es "catalogs as a service": solo las control lists publicas (GET de
 * solo lectura) deben aparecer en la documentacion. El resto del API
 * (escritura PATCH/POST, auth, qa-token, administracion, etc.) NO se expone,
 * aunque siga existiendo y protegido por sus guards.
 *
 * El documento OpenAPI se filtra a esta lista en main.ts ANTES de servirlo.
 *
 * IMPORTANTE: mantener en sync con el mapa de la documentacion publica
 * (wiki: context/documentation-endpoints-map.md) y con el catalogo del front
 * (clarisa-front/src/assets/api-reference/catalog.json).
 *
 * Formato: path exacto tal como aparece en el spec (con prefijo /api). Solo se
 * conserva el metodo GET de cada path.
 */
export const PUBLIC_OPENAPI_PATHS: string[] = [
  // General Control List
  '/api/cgiar-entities',
  '/api/cgiar-entity-types',
  '/api/countries',
  '/api/regions/un-regions',
  '/api/regions/one-cgiar-regions',
  '/api/acronyms',
  '/api/glossary',
  '/api/cgiar-entities/groups',
  '/api/projects',
  // Institutions
  '/api/institutions',
  '/api/institution-dictionary',
  '/api/institution-types',
  // Research Strategy 2030
  '/api/action-areas',
  '/api/impact-areas',
  '/api/impact-area-indicators',
  '/api/sdgs',
  '/api/sdg-targets',
  '/api/sdg-indicators',
  '/api/initiatives',
  '/api/end-of-initiative-outcomes',
  '/api/action-area-outcomes',
  '/api/action-area-outcome-indicators',
  '/api/workpackages',
  '/api/study-types',
  // Innovation Catalog
  '/api/business-categories',
  '/api/technical-fields',
  '/api/innovation-types',
  '/api/governance-types',
  '/api/environmental-benefits',
  '/api/technology-development-stages',
  '/api/innovation-readiness-levels',
  '/api/administrative-scales',
  '/api/oc-users',
  '/api/beneficiaries',
  '/api/investment-types',
  '/api/innovation-use-levels',
  '/api/innovation-characteristics',
  // One CGIAR Operation (CGIAR Accounts / Science Groups / Units).
  // CGIAR Entities and CGIAR Impact Areas reuse paths already listed above.
  '/api/accounts',
  '/api/account-types',
  '/api/science-groups',
  '/api/units',
  // Concepts (the Global Concepts module) — public read only; writes, requests,
  // admin and MCP stay out of the spec.
  '/api/meliaf-taxonomy',
  '/api/meliaf-taxonomy/lists',
  '/api/meliaf-taxonomy/concepts',
  '/api/meliaf-taxonomy/concepts/{termId}',
  '/api/meliaf-taxonomy/concepts/{termId}/history',
  '/api/meliaf-taxonomy/changes',
  '/api/meliaf-taxonomy/releases',
  '/api/meliaf-taxonomy/export',
];

/**
 * Consulta de UN registro (`GET <lista>/get/{id}`) que se publica junto a su
 * lista. La documentacion la descubre sola en el spec y le arma su seccion y
 * su "Run"; aqui solo se decide cuales entran.
 *
 * Clave = path de la lista (tiene que estar en PUBLIC_OPENAPI_PATHS).
 * Valor = el campo de cada item de la lista cuyo valor va en `{id}`. Viaja en
 * el spec como `x-clarisa-list-field` para que la doc arme un ejemplo real con
 * el primer registro.
 *
 * Solo entran las listas cuyo `get/{id}` devuelve EL MISMO registro con LA
 * MISMA forma que un item de la lista (medido contra clarisatest el
 * 2026-10-01). Quedan fuera a proposito, porque documentarlas ensenaria algo
 * falso:
 * - buscan por un id interno que la lista no publica: countries (la lista da
 *   el M49 en `code`, `get/20` devuelve otro pais), science-groups, units,
 *   glossary, impact-area-indicators, action-area-outcome-indicators,
 *   workpackages;
 * - devuelven la entidad cruda (snake_case) en vez del DTO de la lista:
 *   institution-types, sdg-indicators, initiatives, action-area-outcomes;
 * - no tienen `get/{id}` o no acepta el `code` de la lista: cgiar-entities,
 *   cgiar-entity-types, administrative-scales, regions, projects,
 *   cgiar-entities/groups, end-of-initiative-outcomes.
 */
export const PUBLIC_RECORD_LOOKUPS: Record<string, 'id' | 'code'> = {
  // General Control List
  '/api/acronyms': 'code',
  // Institutions (`get/{id}` suma `is_active` a los campos de la lista)
  '/api/institutions': 'code',
  '/api/institution-dictionary': 'code',
  // Research Strategy 2030
  '/api/action-areas': 'id',
  '/api/impact-areas': 'id',
  '/api/sdgs': 'id',
  '/api/sdg-targets': 'id',
  '/api/study-types': 'id',
  // Innovation Catalog
  '/api/business-categories': 'id',
  '/api/technical-fields': 'id',
  '/api/innovation-types': 'code',
  '/api/governance-types': 'id',
  '/api/environmental-benefits': 'id',
  '/api/technology-development-stages': 'id',
  '/api/innovation-readiness-levels': 'id',
  '/api/oc-users': 'id',
  '/api/beneficiaries': 'id',
  '/api/investment-types': 'id',
  '/api/innovation-use-levels': 'id',
  '/api/innovation-characteristics': 'id',
  // One CGIAR Operation
  '/api/accounts': 'code',
  '/api/account-types': 'id',
};

/** Path del spec de la consulta de un registro de esa lista. */
export const recordLookupPath = (listPath: string): string =>
  `${listPath}/get/{id}`;
