// The front's spec tsconfig only loads the jest types, so Node's globals are declared here.
declare const require: (id: string) => any;
declare const process: { cwd(): string };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readFileSync } = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { join } = require('path');

import { buildUsageTree } from '../../../clarisa-panel/manage/pages/microservices-admin/utils/endpoint-catalog';

/**
 * The public API reference (static assets) and the glossary, 2026-11-11: the
 * glossary is documented as v1 (`api/glossary`) plus v2 (`api/v2/glossary`,
 * versioned in the path), and the MELIAF taxonomy is not documented any more
 * (hidden product; its routes keep answering because the glossary page uses
 * them). Changing either is a conscious change: this spec fails first.
 */
describe('API reference — glossary and MELIAF taxonomy (static assets)', () => {
  const dir = join(process.cwd(), 'src/assets/api-reference');
  const catalog = JSON.parse(readFileSync(join(dir, 'catalog.json'), 'utf8'));
  const html: string = readFileSync(join(dir, 'index.html'), 'utf8');

  const findRoutes = (node: any, found: any[] = []): any[] => {
    if (Array.isArray(node)) {
      node.forEach(child => findRoutes(child, found));
    } else if (node && typeof node === 'object') {
      if (typeof node.route === 'string') {
        found.push(node);
      }
      Object.values(node).forEach(child => findRoutes(child, found));
    }
    return found;
  };
  const categories = (): any[] => catalog.groups.flatMap((group: any) => group.categories);

  it('catalog.json lists exactly the two glossary entries: v1 and v2', () => {
    const entries = findRoutes(catalog).filter(entry => /(^|\/)glossary(\/|$)/.test(entry.route));
    expect(entries).toEqual([
      { name: 'Glossary', route: 'api/glossary', method: 'get' },
      { name: 'Glossary (v2)', route: 'api/v2/glossary', method: 'get' }
    ]);
  });

  it('catalog.json documents nothing of the MELIAF taxonomy', () => {
    expect(findRoutes(catalog).filter(entry => entry.route.startsWith('api/meliaf-taxonomy'))).toEqual([]);
    expect(categories().map(category => category.name)).not.toContain('MELIAF taxonomy');
    expect(JSON.stringify(catalog)).not.toMatch(/meliaf/i);
  });

  it('index.html explains v2 of the glossary, without naming the MELIAF taxonomy', () => {
    const match = html.match(/const PATH_VERSIONED = \{([\s\S]*?)\n\};/);
    expect(match).not.toBeNull();
    const note = match![1];
    expect(note).toMatch(/^\s*'glossary':/m);
    expect(note).toContain('termUri');
    expect(note).toContain('taxonomyStatus');
    expect(note).toContain('https://api.clarisa.cgiar.org/meliaf-taxonomy/391');
    expect(note).not.toMatch(/MELIAF taxonomy/);
    // The ?version=N mechanism stays for the original resources only.
    const v2 = html.match(/const V2_ENDPOINTS = \{([\s\S]*?)\n\};/);
    expect([...v2![1].matchAll(/^\s*'([^']+)':/gm)].map(m => m[1])).toEqual([
      'cgiar-entities',
      'cgiar-entity-typology',
      'sdgs',
      'sdg-targets',
      'sdg-indicators'
    ]);
  });

  it('index.html says the path-versioned glossary ignores ?version=N', () => {
    expect(html).toMatch(
      /Resources versioned from the glossary on carry the version in the path and ignore <code class="docpill">\?version=N<\/code>/
    );
  });

  // Old links point at the removed category; the viewer must fall back to the
  // default page instead of an error or a blank panel.
  it('an old link to the MELIAF taxonomy category falls back to the docs home', () => {
    expect(categories().some(category => slug(category.name) === slug('MELIAF_taxonomy'))).toBe(false);
    expect(html).toContain('if (!openDeepLink()) goHome();');
  });

  it('the usage Overview parks taxonomy traffic under "Other CLARISA endpoints" without throwing', () => {
    const tree = buildUsageTree(catalog, [
      {
        microservice_name: 'clarisa-api',
        endpoint: '/api/meliaf-taxonomy/concepts',
        http_method: 'GET',
        total_requests: 5,
        error_count: 0,
        avg_response_time_ms: null,
        unique_api_keys: 1,
        last_used_at: null,
        consumers: []
      }
    ]);
    const other = tree.find(group => group.kind === 'other');
    expect(other?.total_requests).toBe(5);
    expect(other?.categories.map(category => category.name)).toEqual(['api/meliaf-taxonomy']);
    expect(tree.filter(group => group.kind === 'catalog').every(group => group.total_requests === 0)).toBe(true);
  });
});

/** Same slug as the viewer (`index.html`): how it matches `?category=`. */
function slug(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
