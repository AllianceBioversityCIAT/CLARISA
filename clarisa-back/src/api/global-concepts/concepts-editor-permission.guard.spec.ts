import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { DropMeliafFromConcepts1790600500000 } from '../../../migrations/1790600500000-DropMeliafFromConcepts';

/**
 * The real PermissionGuard (path substring match) with the permission the
 * CONCEPTS_CE role holds: it must open the concept routes and nothing else of
 * the Concepts admin, while the full-admin permission keeps opening everything.
 */
describe('PermissionGuard with the concepts-editor permission', () => {
  const CONCEPTS = DropMeliafFromConcepts1790600500000.CONCEPTS_ROUTE;
  const FULL = DropMeliafFromConcepts1790600500000.FULL_ROUTE;
  const BASE = '/api/concepts/admin';

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
    `${BASE}/concepts/concepts`,
    `${BASE}/concepts/concepts?status=draft`,
    `${BASE}/concepts/concepts/2374`,
    `${BASE}/concepts/concepts/2374/labels`,
    `${BASE}/concepts/concepts/2374/status`,
    `${BASE}/concepts/concepts/2374/relations/remove`,
    `${BASE}/concepts/concepts/2374/mappings/4`,
    `${BASE}/concepts/concepts/2374/merge`,
    `${BASE}/concepts/concepts/2374/icons`,
    `${BASE}/concepts/concepts/2374/icons/3`,
    `${BASE}/concepts/concepts-meta/fields`,
    `${BASE}/concepts/concepts-meta/lists`,
    `${BASE}/concepts/concepts-assist/status`,
    `${BASE}/concepts/concepts-assist/chat`,
  ];
  const denied = [
    `${BASE}/concepts/lists`,
    `${BASE}/concepts/lists/4`,
    `${BASE}/concepts/fields`,
    `${BASE}/concepts/fields/2`,
    `${BASE}/concepts/collections`,
    `${BASE}/concepts/import`,
    `${BASE}/concepts/import/preview`,
    `${BASE}/concepts/import-fields`,
    `${BASE}/concepts/releases`,
    `${BASE}/concepts/quality`,
    `${BASE}/concepts/usage`,
    `${BASE}/concepts/requests`,
    `${BASE}/requests/5`,
    `${BASE}/requests/5/transition`,
    `${BASE}/concepts/icons/3`,
    `${BASE}/ai/status`,
    `${BASE}/concepts/ai/normalize`,
    `${BASE}/concepts/ai/embeddings/refresh`,
    // A query string can never smuggle the permission in.
    `${BASE}/concepts/lists?x=${CONCEPTS}`,
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
