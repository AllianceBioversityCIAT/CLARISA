import { ForbiddenException } from '@nestjs/common';
import {
  permissionGuardFor,
  requestTo,
} from '../../shared/guards/permission-guard.spec-helper';
import { MeliafTaxonomyApiPrefix1790600700000 } from '../../../migrations/1790600700000-MeliafTaxonomyApiPrefix';

/**
 * The real PermissionGuard (path substring match) with the permission the
 * CONCEPTS_CE role holds: it must open the concept routes and nothing else of
 * the Concepts admin, while the full-admin permission keeps opening everything.
 */
describe('PermissionGuard with the concepts-editor permission', () => {
  const CONCEPTS = MeliafTaxonomyApiPrefix1790600700000.CONCEPTS_ROUTE;
  const FULL = MeliafTaxonomyApiPrefix1790600700000.FULL_ROUTE;
  const BASE = '/api/meliaf-taxonomy/admin';

  const guardFor = (permissions: string[]) =>
    permissionGuardFor(permissions, 'concepts.editor@clarisa.test');
  const ctx = (url: string) => requestTo(url, 'concepts.editor@clarisa.test');

  const allowed = [
    `${BASE}/concepts`,
    `${BASE}/concepts?status=draft`,
    `${BASE}/concepts/2374`,
    `${BASE}/concepts/2374/labels`,
    `${BASE}/concepts/2374/status`,
    `${BASE}/concepts/2374/relations/remove`,
    `${BASE}/concepts/2374/mappings/4`,
    `${BASE}/concepts/2374/merge`,
    `${BASE}/concepts/2374/icons`,
    `${BASE}/concepts/2374/icons/3`,
    `${BASE}/concepts-meta/fields`,
    `${BASE}/concepts-meta/lists`,
    `${BASE}/concepts-assist/status`,
    `${BASE}/concepts-assist/chat`,
  ];
  const denied = [
    `${BASE}/lists`,
    `${BASE}/lists/4`,
    `${BASE}/fields`,
    `${BASE}/fields/2`,
    `${BASE}/collections`,
    `${BASE}/import`,
    `${BASE}/import/preview`,
    `${BASE}/import-fields`,
    `${BASE}/releases`,
    `${BASE}/quality`,
    `${BASE}/usage`,
    `${BASE}/requests`,
    `${BASE}/requests/5`,
    `${BASE}/requests/5/transition`,
    `${BASE}/icons/3`,
    `${BASE}/ai/status`,
    `${BASE}/ai/normalize`,
    `${BASE}/ai/embeddings/refresh`,
    // A query string can never smuggle the permission in.
    `${BASE}/lists?x=${CONCEPTS}`,
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
