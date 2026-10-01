import { ForbiddenException } from '@nestjs/common';
import {
  permissionGuardFor,
  requestTo,
} from '../../shared/guards/permission-guard.spec-helper';
import { ConceptsSchemeCodeMeliafTaxonomy1790600600000 } from '../../../migrations/1790600600000-ConceptsSchemeCodeMeliafTaxonomy';

/**
 * The real PermissionGuard (path substring match) with the permission the
 * CONCEPTS_CE role holds: it must open the concept routes and nothing else of
 * the Concepts admin, while the full-admin permission keeps opening everything.
 */
describe('PermissionGuard with the concepts-editor permission', () => {
  const CONCEPTS = ConceptsSchemeCodeMeliafTaxonomy1790600600000.CONCEPTS_ROUTE;
  const FULL = ConceptsSchemeCodeMeliafTaxonomy1790600600000.FULL_ROUTE;
  const BASE = '/api/concepts/admin';

  const guardFor = (permissions: string[]) =>
    permissionGuardFor(permissions, 'concepts.editor@clarisa.test');
  const ctx = (url: string) => requestTo(url, 'concepts.editor@clarisa.test');

  const allowed = [
    `${BASE}/meliaf-taxonomy/concepts`,
    `${BASE}/meliaf-taxonomy/concepts?status=draft`,
    `${BASE}/meliaf-taxonomy/concepts/2374`,
    `${BASE}/meliaf-taxonomy/concepts/2374/labels`,
    `${BASE}/meliaf-taxonomy/concepts/2374/status`,
    `${BASE}/meliaf-taxonomy/concepts/2374/relations/remove`,
    `${BASE}/meliaf-taxonomy/concepts/2374/mappings/4`,
    `${BASE}/meliaf-taxonomy/concepts/2374/merge`,
    `${BASE}/meliaf-taxonomy/concepts/2374/icons`,
    `${BASE}/meliaf-taxonomy/concepts/2374/icons/3`,
    `${BASE}/meliaf-taxonomy/concepts-meta/fields`,
    `${BASE}/meliaf-taxonomy/concepts-meta/lists`,
    `${BASE}/meliaf-taxonomy/concepts-assist/status`,
    `${BASE}/meliaf-taxonomy/concepts-assist/chat`,
  ];
  const denied = [
    `${BASE}/meliaf-taxonomy/lists`,
    `${BASE}/meliaf-taxonomy/lists/4`,
    `${BASE}/meliaf-taxonomy/fields`,
    `${BASE}/meliaf-taxonomy/fields/2`,
    `${BASE}/meliaf-taxonomy/collections`,
    `${BASE}/meliaf-taxonomy/import`,
    `${BASE}/meliaf-taxonomy/import/preview`,
    `${BASE}/meliaf-taxonomy/import-fields`,
    `${BASE}/meliaf-taxonomy/releases`,
    `${BASE}/meliaf-taxonomy/quality`,
    `${BASE}/meliaf-taxonomy/usage`,
    `${BASE}/meliaf-taxonomy/requests`,
    `${BASE}/requests/5`,
    `${BASE}/requests/5/transition`,
    `${BASE}/meliaf-taxonomy/icons/3`,
    `${BASE}/ai/status`,
    `${BASE}/meliaf-taxonomy/ai/normalize`,
    `${BASE}/meliaf-taxonomy/ai/embeddings/refresh`,
    // A query string can never smuggle the permission in.
    `${BASE}/meliaf-taxonomy/lists?x=${CONCEPTS}`,
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
