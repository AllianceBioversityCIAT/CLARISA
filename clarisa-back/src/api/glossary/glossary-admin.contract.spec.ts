// LDAPAuth reads src/shared/config/config.ts, which is git-ignored and absent in
// CI; nothing here authenticates (same mock as auth.service.spec).
jest.mock('../../auth/utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));

import { RequestMethod, ValidationPipe } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  PIPES_METADATA,
} from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import {
  GLOSSARY_BULK_MAX_ROWS,
  GLOSSARY_MAX_ALTERNATIVE_LABELS,
  GlossaryBulkConflictPolicy,
  GlossaryBulkRowAction,
  REFERENCE_DATE_PATTERN,
} from './dto/glossary-admin.dto';
import { GlossaryAdminController } from './glossary-admin.controller';
import { GlossaryAdminService } from './glossary-admin.service';

/**
 * The ADMIN CONTRACT of the glossary — what the CLARISA panel calls under
 * `api/glossary/admin` — pinned as it is on 2026-10-28.
 *
 * It is not public (excluded from OpenAPI), but the panel integrates against
 * these routes, guards and vocabularies, and the public endpoints depend on
 * what this surface writes. Extending the glossary (MELIAF taxonomy) must add
 * to this table, never rename or remove a row of it.
 */

/** `(method, path)` of every handler a controller class declares. */
function routesOf(controller: any): string[] {
  const proto = controller.prototype;
  return Object.getOwnPropertyNames(proto)
    .filter((name) => name !== 'constructor')
    .map((name) => {
      const path = Reflect.getMetadata(PATH_METADATA, proto[name]);
      const method = Reflect.getMetadata(METHOD_METADATA, proto[name]);
      return path === undefined ? null : `${RequestMethod[method]} ${path}`;
    })
    .filter((route): route is string => route !== null)
    .sort();
}

describe('Glossary admin contract (as the panel uses it)', () => {
  it('is mounted under admin and declares exactly these routes', () => {
    expect(Reflect.getMetadata(PATH_METADATA, GlossaryAdminController)).toBe(
      'admin',
    );
    expect(routesOf(GlossaryAdminController)).toEqual([
      'DELETE terms/:id/group',
      'GET terms',
      'GET terms/:id',
      'PATCH terms/:id',
      'PATCH terms/:id/editorial-status',
      'PATCH terms/:id/status',
      'POST bulk/import',
      'POST bulk/preview',
      'POST terms',
      'POST terms/:id/group',
      'POST terms/:id/merge',
      'POST terms/:id/versions',
    ]);
  });

  it('asks who calls AND whether they may: JWT + permission, on the whole class', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, GlossaryAdminController),
    ).toEqual([JwtAuthGuard, PermissionGuard]);
  });

  it('validates every body: unknown keys are refused, values are transformed', () => {
    const [pipe] = Reflect.getMetadata(PIPES_METADATA, GlossaryAdminController);
    expect(pipe).toBeInstanceOf(ValidationPipe);
    expect(pipe.validatorOptions).toMatchObject({
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(pipe.isTransformEnabled).toBe(true);
  });

  it('stays out of the public OpenAPI document', () => {
    expect(
      Reflect.getMetadata(
        DECORATORS.API_EXCLUDE_CONTROLLER,
        GlossaryAdminController,
      ),
    ).toEqual([true]);
  });

  it('lists every term by default (show=all), unlike the public endpoint', async () => {
    const service = {
      findAllForAdmin: jest.fn().mockResolvedValue([]),
    } as unknown as GlossaryAdminService;
    const controller = new GlossaryAdminController(service);
    await controller.findAll(undefined);
    expect(service.findAllForAdmin).toHaveBeenCalledWith(
      FindAllOptions.SHOW_ALL,
    );
    await controller.findAll(FindAllOptions.SHOW_ONLY_INACTIVE);
    expect(service.findAllForAdmin).toHaveBeenLastCalledWith('inactive');
  });

  it('keeps the vocabulary and the limits the panel was built on', () => {
    expect(Object.values(GlossaryBulkConflictPolicy)).toEqual([
      'skip',
      'update',
    ]);
    expect(Object.values(GlossaryBulkRowAction)).toEqual([
      'create',
      'update',
      'reactivate',
      'skip',
      'invalid',
    ]);
    expect(GLOSSARY_BULK_MAX_ROWS).toBe(2000);
    expect(GLOSSARY_MAX_ALTERNATIVE_LABELS).toBe(30);
    expect(REFERENCE_DATE_PATTERN.test('2025-01-15')).toBe(true);
    expect(REFERENCE_DATE_PATTERN.test('2025-01-15T00:00:00Z')).toBe(false);
  });
});
