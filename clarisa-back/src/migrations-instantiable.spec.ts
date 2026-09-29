import { readdirSync } from 'fs';
import { join } from 'path';

/**
 * `migration:run` loads every file in `migrations/` and calls `new` on EVERY
 * export, not only the migration class. An exported helper function crashes
 * the whole run before any SQL executes (clarisa-application-dev build 285,
 * 2026-09-28: `new toValue()` → "Cannot read properties of undefined").
 */
describe('migrations folder', () => {
  const dir = join(__dirname, '..', 'migrations');
  const files = readdirSync(dir).filter((f) => /\.(ts|js)$/.test(f));

  it.each(files)('%s only exports instantiable migrations', (file) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const exported: Record<string, unknown> = require(join(dir, file));
    for (const [name, value] of Object.entries(exported)) {
      expect(() => new (value as new () => unknown)()).not.toThrow();
      const up = (value as { prototype?: { up?: unknown } }).prototype?.up;
      expect({ name, up: typeof up }).toEqual({ name, up: 'function' });
    }
  });
});
