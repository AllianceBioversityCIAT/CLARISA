// The front's spec tsconfig only loads the jest types, so Node's globals are declared here.
declare const require: (id: string) => any;
declare const process: { cwd(): string };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readFileSync } = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { join } = require('path');

/**
 * The public API reference lists the glossary as a single-version endpoint.
 * When the glossary gets a `?version=2`, these two static files must change
 * together with it: this spec fails first, so that update is a conscious one.
 */
describe('API reference — glossary entry (static assets)', () => {
  const dir = join(process.cwd(), 'src/assets/api-reference');
  const catalog = JSON.parse(readFileSync(join(dir, 'catalog.json'), 'utf8'));
  const html = readFileSync(join(dir, 'index.html'), 'utf8');

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

  it('catalog.json has exactly one Glossary entry: GET api/glossary', () => {
    const entries = findRoutes(catalog).filter(entry => entry.route.startsWith('api/glossary'));
    expect(entries).toEqual([{ name: 'Glossary', route: 'api/glossary', method: 'get' }]);
  });

  it('index.html declares a V2_ENDPOINTS map that does not include glossary', () => {
    const match = html.match(/const V2_ENDPOINTS = \{([\s\S]*?)\n\};/);
    expect(match).not.toBeNull();
    const keys = [...match![1].matchAll(/^\s*'([^']+)':/gm)].map(m => m[1]);
    expect(keys.length).toBeGreaterThan(0);
    // pinned as-is: adding v2 to the glossary means adding it here on purpose.
    expect(keys).not.toContain('glossary');
    expect(keys).toEqual(['cgiar-entities', 'cgiar-entity-typology', 'sdgs', 'sdg-targets', 'sdg-indicators']);
  });

  it('index.html tells readers that single-version endpoints ignore ?version=2', () => {
    expect(html).toContain('This endpoint has a single version.');
    expect(html).toMatch(/if \(V2_ENDPOINTS\[baseRoute\] && !params\.some\(p => p\.name === 'version'\)\)/);
  });
});
