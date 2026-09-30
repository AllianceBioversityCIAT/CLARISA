import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { AddMeliafConceptsEditorRole1790600100000 } from '../../../migrations/1790600100000-AddMeliafConceptsEditorRole';

/**
 * The real PermissionGuard (path substring match) with the permission the
 * MELIAF_CE role holds: it must open the concept routes and nothing else of
 * the MELIAF admin, while the full-admin permission keeps opening everything.
 */
describe('PermissionGuard with the MELIAF concepts permission', () => {
  const CONCEPTS = AddMeliafConceptsEditorRole1790600100000.CONCEPTS_ROUTE;
  const FULL = AddMeliafConceptsEditorRole1790600100000.FULL_ROUTE;
  const BASE = '/api/meliaf-taxonomy/admin';

  const guardFor = (permissions: string[]) => {
    const users = {
      findOneByEmail: jest.fn(async () => ({
        id: 9,
        email: 'concepts.editor@clarisa.test',
        permissions,
      })),
    };
    const moduleRef = { get: () => users } as unknown as ModuleRef;
    const reflector = { get: () => undefined } as unknown as Reflector;
    return new PermissionGuard(reflector, moduleRef);
  };
  const ctx = (url: string) =>
    ({
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: { email: 'concepts.editor@clarisa.test' },
          originalUrl: url,
        }),
      }),
    }) as unknown as ExecutionContext;

  const allowed = [
    `${BASE}/meliaf/concepts`,
    `${BASE}/meliaf/concepts?status=draft`,
    `${BASE}/meliaf/concepts/2374`,
    `${BASE}/meliaf/concepts/2374/labels`,
    `${BASE}/meliaf/concepts/2374/status`,
    `${BASE}/meliaf/concepts/2374/relations/remove`,
    `${BASE}/meliaf/concepts/2374/mappings/4`,
    `${BASE}/meliaf/concepts/2374/merge`,
    `${BASE}/meliaf/concepts/2374/icons`,
    `${BASE}/meliaf/concepts/2374/icons/3`,
    `${BASE}/meliaf/concepts-meta/fields`,
    `${BASE}/meliaf/concepts-meta/lists`,
  ];
  const denied = [
    `${BASE}/meliaf/lists`,
    `${BASE}/meliaf/lists/4`,
    `${BASE}/meliaf/fields`,
    `${BASE}/meliaf/fields/2`,
    `${BASE}/meliaf/collections`,
    `${BASE}/meliaf/import`,
    `${BASE}/meliaf/import/preview`,
    `${BASE}/meliaf/import-fields`,
    `${BASE}/meliaf/releases`,
    `${BASE}/meliaf/quality`,
    `${BASE}/meliaf/usage`,
    `${BASE}/meliaf/requests`,
    `${BASE}/requests/5`,
    `${BASE}/requests/5/transition`,
    `${BASE}/meliaf/icons/3`,
    `${BASE}/ai/status`,
    `${BASE}/meliaf/ai/normalize`,
    `${BASE}/meliaf/ai/embeddings/refresh`,
    // A query string can never smuggle the permission in.
    `${BASE}/meliaf/lists?x=${CONCEPTS}`,
    '/api/access-admin/roles',
  ];

  it.each(allowed)('concepts-only allows %s', async (url) => {
    await expect(guardFor([CONCEPTS]).canActivate(ctx(url))).resolves.toBe(
      true,
    );
  });

  it.each(denied)('concepts-only denies %s', async (url) => {
    await expect(
      guardFor([CONCEPTS]).canActivate(ctx(url)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([...allowed, ...denied.slice(0, -1)])(
    'full admin still allows %s',
    async (url) => {
      await expect(guardFor([FULL]).canActivate(ctx(url))).resolves.toBe(true);
    },
  );
});
