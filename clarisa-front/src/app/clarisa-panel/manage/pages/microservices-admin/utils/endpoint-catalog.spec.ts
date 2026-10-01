import { EndpointUsageItem } from '../../../services/manage-api.service';
import { buildUsageTree, Catalog, filterUsageTree, matchCatalogRoute } from './endpoint-catalog';

const catalog: Catalog = {
  groups: [
    {
      group: 'One CGIAR Control List',
      categories: [
        {
          name: 'General Control List',
          endpoints: [
            { name: 'CGIAR entities', route: 'api/cgiar-entities', method: 'get' },
            { name: 'CGIAR entities groups', route: 'api/cgiar-entities/groups', method: 'get' },
            { name: 'Countries', route: 'api/countries', method: 'get' }
          ]
        },
        {
          name: 'Institutions',
          endpoints: [{ name: 'Institutions', route: 'api/institutions', method: 'get' }]
        }
      ]
    },
    {
      group: 'One CGIAR Operation',
      categories: [
        {
          name: 'CGIAR Entities',
          endpoints: [{ name: 'CGIAR entities', route: 'api/cgiar-entities', method: 'get' }]
        }
      ]
    }
  ]
};

const item = (over: Partial<EndpointUsageItem>): EndpointUsageItem => ({
  microservice_name: 'clarisa-api',
  endpoint: '/api/institutions',
  http_method: 'GET',
  total_requests: 1,
  error_count: 0,
  avg_response_time_ms: null,
  unique_api_keys: 1,
  last_used_at: null,
  consumers: [],
  ...over
});

const consumer = (id: number, name: string, requests: number, last: string | null = null) => ({
  api_key_id: id,
  api_key_name: name,
  key_prefix: `cl_prod_${id}`,
  mis_id: null,
  mis_acronym: null,
  total_requests: requests,
  last_used_at: last
});

describe('matchCatalogRoute', () => {
  const routes = catalog.groups[0].categories.flatMap(c => c.endpoints);

  it('takes the longest route that covers the path at a segment boundary', () => {
    expect(matchCatalogRoute('/api/cgiar-entities/groups', 'GET', routes)?.route).toBe('api/cgiar-entities/groups');
    expect(matchCatalogRoute('/api/cgiar-entities', 'GET', routes)?.route).toBe('api/cgiar-entities');
    expect(matchCatalogRoute('/api/institutions/get/221', 'get', routes)?.route).toBe('api/institutions');
    // `api/countries-extra` is not `api/countries/…`
    expect(matchCatalogRoute('/api/countries-extra', 'GET', routes)).toBeNull();
  });

  it('respects the method when the log carries one', () => {
    expect(matchCatalogRoute('/api/institutions', 'POST', routes)).toBeNull();
    expect(matchCatalogRoute('/api/institutions', null, routes)?.route).toBe('api/institutions');
  });
});

describe('buildUsageTree', () => {
  it('hangs usage from the public catalogue and folds path params into their endpoint', () => {
    const tree = buildUsageTree(catalog, [
      item({
        endpoint: '/api/institutions',
        total_requests: 100,
        error_count: 2,
        avg_response_time_ms: 100,
        consumers: [consumer(1, 'Reporting Tool', 90, '2026-09-20T00:00:00Z'), consumer(2, 'STAR', 10)]
      }),
      item({
        endpoint: '/api/institutions/get/221',
        total_requests: 50,
        avg_response_time_ms: 40,
        last_used_at: '2026-09-24T00:00:00Z',
        consumers: [consumer(1, 'Reporting Tool', 50, '2026-09-24T00:00:00Z')]
      })
    ]);

    const controlList = tree[0];
    expect(controlList.kind).toBe('catalog');
    const institutions = controlList.categories[1].endpoints[0];
    expect(institutions).toMatchObject({
      name: 'Institutions',
      route: 'api/institutions',
      method: 'GET',
      documented: true,
      total_requests: 150,
      error_count: 2,
      avg_response_time_ms: 80,
      unique_api_keys: 2,
      last_used_at: '2026-09-24T00:00:00Z',
      paths: ['/api/institutions', '/api/institutions/get/221']
    });
    expect(institutions.consumers).toEqual([
      expect.objectContaining({ api_key_id: 1, total_requests: 140, last_used_at: '2026-09-24T00:00:00Z' }),
      expect.objectContaining({ api_key_id: 2, total_requests: 10 })
    ]);
    expect(controlList.categories[1].total_requests).toBe(150);
    expect(controlList.total_requests).toBe(150);
  });

  it('keeps every documented endpoint, at zero, and shares a route listed under two groups', () => {
    const tree = buildUsageTree(catalog, [item({ endpoint: '/api/cgiar-entities', total_requests: 7 })]);

    const generalList = tree[0].categories[0].endpoints;
    expect(generalList.map(e => [e.name, e.total_requests])).toEqual([
      ['CGIAR entities', 7],
      ['CGIAR entities groups', 0],
      ['Countries', 0]
    ]);
    const operation = tree[1].categories[0].endpoints[0];
    expect(operation.total_requests).toBe(7);
    expect(operation).toBe(generalList[0]);
  });

  it('parks undocumented CLARISA routes by resource and satellite services by name', () => {
    const tree = buildUsageTree(catalog, [
      item({ endpoint: '/api/partner-requests/create', http_method: 'POST', total_requests: 3 }),
      item({ endpoint: '/api/partner-requests', http_method: 'GET', total_requests: 9 }),
      item({ microservice_name: 'reports', endpoint: '/api/email/send', http_method: 'POST', total_requests: 4 })
    ]);

    const other = tree.find(g => g.kind === 'other')!;
    expect(other.categories).toHaveLength(1);
    expect(other.categories[0].name).toBe('api/partner-requests');
    expect(other.categories[0].endpoints.map(e => e.total_requests)).toEqual([9, 3]);
    expect(other.categories[0].endpoints[0].documented).toBe(false);

    const satellite = tree.find(g => g.kind === 'microservice')!;
    expect(satellite.categories[0]).toMatchObject({ name: 'reports', total_requests: 4 });
    expect(satellite.categories[0].endpoints[0].microservice).toBe('reports');
  });

  it('keeps a satellite call and a direct call to the same route apart, and the groups add up to the total', () => {
    const items = [
      item({ endpoint: '/api/partner-requests/create', http_method: 'POST', total_requests: 14 }),
      item({ microservice_name: 'manual-test', endpoint: '/api/partner-requests/create', http_method: 'POST', total_requests: 3 }),
      item({ microservice_name: 'AI STAR', endpoint: '/api/partner-request', http_method: 'POST', total_requests: 10 })
    ];
    const tree = buildUsageTree(catalog, items);

    const other = tree.find(g => g.kind === 'other')!;
    const satellite = tree.find(g => g.kind === 'microservice')!;
    expect(other.total_requests).toBe(14);
    expect(satellite.total_requests).toBe(13);
    expect(satellite.categories.find(c => c.name === 'manual-test')!.endpoints[0].total_requests).toBe(3);
    expect(tree.reduce((sum, g) => sum + g.total_requests, 0)).toBe(27);
  });

  it('works without a catalogue: everything is "other"', () => {
    const tree = buildUsageTree(null, [item({ total_requests: 2 })]);
    expect(tree).toHaveLength(1);
    expect(tree[0].kind).toBe('other');
  });
});

describe('filterUsageTree', () => {
  const tree = buildUsageTree(catalog, [
    item({ endpoint: '/api/institutions', total_requests: 5, consumers: [consumer(1, 'Reporting Tool', 5)] }),
    item({ endpoint: '/api/countries', total_requests: 1 })
  ]);

  it('returns the tree untouched for an empty query', () => {
    expect(filterUsageTree(tree, '  ')).toBe(tree);
  });

  it('matches by route, by consumer, and drops empty branches', () => {
    expect(filterUsageTree(tree, 'countr')[0].categories[0].endpoints.map(e => e.route)).toEqual(['api/countries']);
    const byConsumer = filterUsageTree(tree, 'reporting');
    expect(byConsumer).toHaveLength(1);
    expect(byConsumer[0].categories.map(c => c.name)).toEqual(['Institutions']);
    expect(filterUsageTree(tree, 'zzz')).toEqual([]);
  });
});
