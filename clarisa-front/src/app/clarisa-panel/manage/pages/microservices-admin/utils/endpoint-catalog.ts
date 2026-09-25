import { EndpointConsumer, EndpointUsageItem } from '../../../services/manage-api.service';

/**
 * Cuelga el uso registrado de cada endpoint del MISMO árbol que la
 * documentación pública (`assets/api-reference/catalog.json`): grupo →
 * categoría → endpoint. Así el operador navega el consumo con la misma
 * estructura con la que un desarrollador externo navega la doc
 * (Yeck, 24-sep-2026: «esa misma navegación y ver quiénes lo han consumido»).
 *
 * Lo que la doc no lista tampoco se pierde: las rutas propias de CLARISA que
 * no están documentadas van a «Other CLARISA endpoints», agrupadas por su
 * recurso, y lo que reportan los microservicios satélite (validaciones de
 * `reports`, `email`…) va a «Satellite microservices», una categoría por
 * servicio.
 */

export interface CatalogEndpoint {
  name: string;
  route: string;
  method: string;
}

export interface CatalogCategory {
  name: string;
  description?: string;
  endpoints: CatalogEndpoint[];
}

export interface CatalogGroup {
  group: string;
  categories: CatalogCategory[];
}

export interface Catalog {
  groups: CatalogGroup[];
}

export interface UsageTreeEndpoint {
  /** Estable dentro del árbol: `method route`, en minúsculas. */
  key: string;
  name: string;
  route: string;
  method: string | null;
  microservice: string;
  /** `true` si la ruta está en la documentación pública. */
  documented: boolean;
  total_requests: number;
  error_count: number;
  avg_response_time_ms: number | null;
  unique_api_keys: number;
  last_used_at: string | null;
  consumers: EndpointConsumer[];
  /** Las rutas crudas que se plegaron aquí (`/api/institutions/get/221`…). */
  paths: string[];
}

export interface UsageTreeCategory {
  name: string;
  description?: string;
  total_requests: number;
  endpoints: UsageTreeEndpoint[];
}

export interface UsageTreeGroup {
  name: string;
  kind: 'catalog' | 'other' | 'microservice';
  total_requests: number;
  categories: UsageTreeCategory[];
}

/** El nombre con el que el guard interno registra una llamada directa al API. */
export const CLARISA_API_MICROSERVICE = 'clarisa-api';

const OTHER_GROUP = 'Other CLARISA endpoints';
const SATELLITE_GROUP = 'Satellite microservices';

function normalizePath(path: string): string {
  return (path ?? '').trim().replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
}

/**
 * La ruta de la doc que cubre una ruta registrada: la MÁS LARGA cuyo prefijo
 * coincide en un límite de segmento, para que `api/cgiar-entities/groups` gane
 * a `api/cgiar-entities` y `api/institutions/get/221` caiga en
 * `api/institutions`. El método se compara si el registro lo trae; una
 * validación reportada sin método casa por ruta sola.
 */
export function matchCatalogRoute(
  path: string,
  method: string | null,
  routes: { route: string; method: string }[]
): { route: string; method: string } | null {
  const target = normalizePath(path);
  const wanted = method?.toLowerCase() ?? null;
  let best: { route: string; method: string } | null = null;

  for (const candidate of routes) {
    const route = normalizePath(candidate.route);
    if (!route) {
      continue;
    }
    if (wanted && candidate.method && candidate.method.toLowerCase() !== wanted) {
      continue;
    }
    const covers = target === route || target.startsWith(`${route}/`);
    if (covers && (!best || route.length > normalizePath(best.route).length)) {
      best = candidate;
    }
  }
  return best;
}

function mergeConsumers(into: Map<number, EndpointConsumer>, list: EndpointConsumer[]): void {
  for (const consumer of list) {
    const existing = into.get(consumer.api_key_id);
    if (!existing) {
      into.set(consumer.api_key_id, { ...consumer });
      continue;
    }
    existing.total_requests += consumer.total_requests;
    existing.last_used_at = laterOf(existing.last_used_at, consumer.last_used_at);
  }
}

function laterOf(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
}

interface Accumulator {
  node: UsageTreeEndpoint;
  consumers: Map<number, EndpointConsumer>;
  weightedMs: number;
  weightedCount: number;
}

function newAccumulator(key: string, name: string, route: string, method: string | null, microservice: string, documented: boolean): Accumulator {
  return {
    node: {
      key,
      name,
      route,
      method,
      microservice,
      documented,
      total_requests: 0,
      error_count: 0,
      avg_response_time_ms: null,
      unique_api_keys: 0,
      last_used_at: null,
      consumers: [],
      paths: []
    },
    consumers: new Map(),
    weightedMs: 0,
    weightedCount: 0
  };
}

function absorb(acc: Accumulator, item: EndpointUsageItem): void {
  acc.node.total_requests += item.total_requests;
  acc.node.error_count += item.error_count;
  acc.node.last_used_at = laterOf(acc.node.last_used_at, item.last_used_at);
  if (!acc.node.paths.includes(item.endpoint)) {
    acc.node.paths.push(item.endpoint);
  }
  if (item.avg_response_time_ms != null) {
    acc.weightedMs += item.avg_response_time_ms * item.total_requests;
    acc.weightedCount += item.total_requests;
  }
  mergeConsumers(acc.consumers, item.consumers ?? []);
}

function finish(acc: Accumulator): UsageTreeEndpoint {
  const node = acc.node;
  node.consumers = [...acc.consumers.values()].sort((a, b) => b.total_requests - a.total_requests);
  node.unique_api_keys = node.consumers.length;
  node.avg_response_time_ms = acc.weightedCount ? Math.round(acc.weightedMs / acc.weightedCount) : null;
  node.paths.sort();
  return node;
}

/** `api/partner-requests/create` → `api/partner-requests`: el recurso. */
function resourceOf(path: string): string {
  const segments = normalizePath(path).split('/');
  return segments.slice(0, 2).join('/') || path;
}

export function buildUsageTree(catalog: Catalog | null, items: EndpointUsageItem[]): UsageTreeGroup[] {
  const catalogRoutes: { route: string; method: string }[] = [];
  const seenRoutes = new Set<string>();
  for (const group of catalog?.groups ?? []) {
    for (const category of group.categories) {
      for (const endpoint of category.endpoints) {
        const key = `${endpoint.method.toLowerCase()} ${normalizePath(endpoint.route)}`;
        if (!seenRoutes.has(key)) {
          seenRoutes.add(key);
          catalogRoutes.push({ route: endpoint.route, method: endpoint.method });
        }
      }
    }
  }

  // Un acumulador por endpoint de la doc (compartido entre los grupos que lo
  // listan dos veces, como `api/cgiar-entities`), otro por ruta suelta.
  const documented = new Map<string, Accumulator>();
  const other = new Map<string, Accumulator>();
  const satellite = new Map<string, Map<string, Accumulator>>();

  for (const item of items) {
    const isClarisa = (item.microservice_name ?? '').toLowerCase() === CLARISA_API_MICROSERVICE;

    if (!isClarisa) {
      const service = item.microservice_name || 'unknown';
      const byService = satellite.get(service) ?? new Map<string, Accumulator>();
      const key = `${(item.http_method ?? '').toLowerCase()} ${normalizePath(item.endpoint)}`;
      const acc = byService.get(key) ?? newAccumulator(key, item.endpoint, item.endpoint, item.http_method, service, false);
      absorb(acc, item);
      byService.set(key, acc);
      satellite.set(service, byService);
      continue;
    }

    const match = matchCatalogRoute(item.endpoint, item.http_method, catalogRoutes);
    if (match) {
      const key = `${match.method.toLowerCase()} ${normalizePath(match.route)}`;
      const acc = documented.get(key) ?? newAccumulator(key, match.route, match.route, match.method.toUpperCase(), CLARISA_API_MICROSERVICE, true);
      absorb(acc, item);
      documented.set(key, acc);
      continue;
    }

    const key = `${(item.http_method ?? '').toLowerCase()} ${normalizePath(item.endpoint)}`;
    const acc = other.get(key) ?? newAccumulator(key, item.endpoint, item.endpoint, item.http_method, CLARISA_API_MICROSERVICE, false);
    absorb(acc, item);
    other.set(key, acc);
  }

  const finished = new Map<string, UsageTreeEndpoint>();
  const finishedNode = (acc: Accumulator): UsageTreeEndpoint => {
    const done = finished.get(acc.node.key) ?? finish(acc);
    finished.set(acc.node.key, done);
    return done;
  };

  const groups: UsageTreeGroup[] = [];

  for (const group of catalog?.groups ?? []) {
    const categories: UsageTreeCategory[] = [];
    for (const category of group.categories) {
      const endpoints: UsageTreeEndpoint[] = [];
      for (const endpoint of category.endpoints) {
        const key = `${endpoint.method.toLowerCase()} ${normalizePath(endpoint.route)}`;
        const acc = documented.get(key);
        if (acc) {
          const node = finishedNode(acc);
          // El nombre legible es el de la doc; la ruta compartida entre dos
          // grupos conserva el primero que la nombró.
          if (node.name === node.route) {
            node.name = endpoint.name;
          }
          endpoints.push(node);
        } else {
          endpoints.push({
            ...newAccumulator(key, endpoint.name, endpoint.route, endpoint.method.toUpperCase(), CLARISA_API_MICROSERVICE, true).node
          });
        }
      }
      endpoints.sort((a, b) => b.total_requests - a.total_requests);
      categories.push({
        name: category.name,
        description: category.description,
        total_requests: endpoints.reduce((sum, e) => sum + e.total_requests, 0),
        endpoints
      });
    }
    groups.push({
      name: group.group,
      kind: 'catalog',
      total_requests: categories.reduce((sum, c) => sum + c.total_requests, 0),
      categories
    });
  }

  if (other.size) {
    const byResource = new Map<string, UsageTreeEndpoint[]>();
    for (const acc of other.values()) {
      const node = finishedNode(acc);
      const resource = resourceOf(node.route);
      byResource.set(resource, [...(byResource.get(resource) ?? []), node]);
    }
    const categories = [...byResource.entries()]
      .map(([name, endpoints]) => ({
        name,
        total_requests: endpoints.reduce((sum, e) => sum + e.total_requests, 0),
        endpoints: endpoints.sort((a, b) => b.total_requests - a.total_requests)
      }))
      .sort((a, b) => b.total_requests - a.total_requests);
    groups.push({
      name: OTHER_GROUP,
      kind: 'other',
      total_requests: categories.reduce((sum, c) => sum + c.total_requests, 0),
      categories
    });
  }

  if (satellite.size) {
    const categories = [...satellite.entries()]
      .map(([service, accs]) => {
        const endpoints = [...accs.values()].map(finishedNode).sort((a, b) => b.total_requests - a.total_requests);
        return {
          name: service,
          total_requests: endpoints.reduce((sum, e) => sum + e.total_requests, 0),
          endpoints
        };
      })
      .sort((a, b) => b.total_requests - a.total_requests);
    groups.push({
      name: SATELLITE_GROUP,
      kind: 'microservice',
      total_requests: categories.reduce((sum, c) => sum + c.total_requests, 0),
      categories
    });
  }

  return groups;
}

/**
 * Filtra el árbol por texto: nombre, ruta, método, categoría o el nombre de un
 * consumidor. Las categorías y grupos vacíos desaparecen; con `''` devuelve
 * el árbol tal cual.
 */
export function filterUsageTree(groups: UsageTreeGroup[], query: string): UsageTreeGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return groups;
  }
  const hit = (endpoint: UsageTreeEndpoint, category: UsageTreeCategory) =>
    endpoint.name.toLowerCase().includes(q) ||
    endpoint.route.toLowerCase().includes(q) ||
    (endpoint.method ?? '').toLowerCase().includes(q) ||
    category.name.toLowerCase().includes(q) ||
    endpoint.consumers.some(c => c.api_key_name.toLowerCase().includes(q) || (c.mis_acronym ?? '').toLowerCase().includes(q));

  return groups
    .map(group => ({
      ...group,
      categories: group.categories
        .map(category => ({ ...category, endpoints: category.endpoints.filter(e => hit(e, category)) }))
        .filter(category => category.endpoints.length)
    }))
    .filter(group => group.categories.length);
}
