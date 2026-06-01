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
  // One CGIAR Operation
  '/api/accounts',
  '/api/account-types',
  '/api/science-groups',
  '/api/units',
];
