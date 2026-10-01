import { GlobalConceptsApiService, CONCEPT_EXPORT_FORMATS, releaseOptions } from './global-concepts-api.service';

describe('export by version', () => {
  it('releaseOptions puts Current first and the newest release next', () => {
    const opts = releaseOptions([
      { version: '1.0.0', released_at: '2026-09-29T00:00:00Z', release_uri: null, previous_version: null, notes: null, license: null },
      { version: '1.1.0', released_at: '2026-10-01T00:00:00Z', release_uri: null, previous_version: '1.0.0', notes: null, license: null }
    ]);
    expect(opts).toEqual([
      { label: 'Current (latest)', value: null },
      { label: '1.1.0 · 2026-10-01', value: '1.1.0' },
      { label: '1.0.0 · 2026-09-29', value: '1.0.0' }
    ]);
    expect(releaseOptions(null)).toEqual([{ label: 'Current (latest)', value: null }]);
  });

  it('CONCEPT_EXPORT_FORMATS lists the four formats the back serves', () => {
    expect(CONCEPT_EXPORT_FORMATS.map(f => f.format)).toEqual(['json', 'csv', 'skos', 'jsonld']);
  });
});

describe('exportUrl', () => {
  const api = new GlobalConceptsApiService({} as any);

  it('omits the version for the current state and pins a release when given', () => {
    expect(api.exportUrl('concepts', 'csv')).toMatch(/\/api\/meliaf-taxonomy\/export\?format=csv$/);
    expect(api.exportUrl('concepts', 'csv', null)).toMatch(/\/api\/meliaf-taxonomy\/export\?format=csv$/);
    expect(api.exportUrl('concepts', 'jsonld', '1.0.0')).toMatch(/\/api\/meliaf-taxonomy\/export\?format=jsonld&version=1\.0\.0$/);
  });
});
