import { OpenAPIObject } from '@nestjs/swagger';
import {
  PUBLIC_OPENAPI_PATHS,
  PUBLIC_RECORD_LOOKUPS,
  recordLookupPath,
} from './public-endpoints';
import { filterPublicPaths } from './public-openapi';

type Paths = OpenAPIObject['paths'];

const idParam = {
  name: 'id',
  required: true,
  in: 'path' as const,
  schema: { type: 'number' },
};
const getOp = (extra: object = {}) => ({
  responses: { '200': { description: '' } },
  ...extra,
});

describe('filterPublicPaths', () => {
  const spec: Paths = {
    '/api/institutions': { get: getOp(), post: getOp() },
    '/api/institutions/get/{id}': {
      get: getOp({ parameters: [idParam] }),
      patch: getOp(),
    },
    '/api/countries': { get: getOp() },
    // existe en el API, pero devuelve otro registro: no se publica
    '/api/countries/get/{id}': { get: getOp({ parameters: [idParam] }) },
    '/api/users/get/{id}': { get: getOp({ parameters: [idParam] }) },
    '/api/auth/login': { post: getOp() },
  };

  const out = filterPublicPaths(spec);

  it('keeps the lists and the allowlisted record lookups, GET only', () => {
    expect(Object.keys(out).sort()).toEqual([
      '/api/countries',
      '/api/institutions',
      '/api/institutions/get/{id}',
    ]);
    expect(Object.keys(out['/api/institutions'])).toEqual(['get']);
    expect(Object.keys(out['/api/institutions/get/{id}'])).toEqual(['get']);
  });

  it('never publishes a get/{id} that is not in PUBLIC_RECORD_LOOKUPS', () => {
    expect(out['/api/countries/get/{id}']).toBeUndefined();
    expect(out['/api/users/get/{id}']).toBeUndefined();
  });

  it('tells the doc which list field fills the {id}', () => {
    const [param] = out['/api/institutions/get/{id}'].get.parameters as any[];
    expect(param['x-clarisa-list-field']).toBe('code');
    expect(param.description).toContain('`code`');
    expect(param.description).toContain('GET /api/institutions');
    expect(out['/api/institutions/get/{id}'].get.summary).toBe(
      'Retrieve one record by its resource URI',
    );
  });

  it('does not mutate the source spec', () => {
    const [param] = spec['/api/institutions/get/{id}'].get.parameters as any[];
    expect(param['x-clarisa-list-field']).toBeUndefined();
  });
});

describe('PUBLIC_RECORD_LOOKUPS', () => {
  it('only names lists that are themselves public', () => {
    const lists = new Set(PUBLIC_OPENAPI_PATHS);
    const orphans = Object.keys(PUBLIC_RECORD_LOOKUPS).filter(
      (list) => !lists.has(list),
    );
    expect(orphans).toEqual([]);
  });

  it('builds the lookup path the Nest controllers declare (get/:id)', () => {
    expect(recordLookupPath('/api/institutions')).toBe(
      '/api/institutions/get/{id}',
    );
  });
});
