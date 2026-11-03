import { Routes } from '@nestjs/core';

// ApiModule reaches LDAPAuth, which reads the gitignored config.ts (same mock as CI).
jest.mock('../auth/utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));
import { ApiModule } from './api.module';
import { apiRoutes } from './api.routes';

/**
 * `RouterModule` only assigns a path prefix: a module named in `apiRoutes`
 * that `ApiModule` does not import is never instantiated, so its controllers
 * answer 404 in the real app while a test that mounts the module directly
 * stays green. 2026-10-29: `GlossaryV2Module` reached clarisatest that way.
 */
const modulesOf = (routes: Routes): Set<unknown> => {
  const found = new Set<unknown>();
  const walk = (list: Routes) => {
    for (const route of list) {
      if (route.module) found.add(route.module);
      if (route.children) walk(route.children as Routes);
    }
  };
  walk(routes);
  return found;
};

describe('api.routes wiring', () => {
  it('every module mounted in apiRoutes is imported by ApiModule', () => {
    const imported = new Set<unknown>(
      Reflect.getMetadata('imports', ApiModule) ?? [],
    );
    const missing = [...modulesOf(apiRoutes)]
      .filter((m) => !imported.has(m))
      .map((m) => (m as { name: string }).name);
    expect(missing).toEqual([]);
  });
});
