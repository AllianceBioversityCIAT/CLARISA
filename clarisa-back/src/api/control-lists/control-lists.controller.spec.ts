import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { ControlListsEnabledGuard } from './control-lists-enabled.guard';
import {
  ControlListsAdminController,
  ControlListsPublicController,
} from './control-lists.controller';

/**
 * Ratchet (review 2026-11-13 §6): CLARISA has no global guard and
 * `BasicAuthMiddleware` never refuses, so a route of this module is open
 * unless it carries the guards itself. Fails if a handler is added without
 * them, or if the public controller grows a write route.
 */
function handlers(ctrl: any): string[] {
  return Object.getOwnPropertyNames(ctrl.prototype).filter(
    (k) =>
      k !== 'constructor' &&
      Reflect.getMetadata(PATH_METADATA, ctrl.prototype[k]) !== undefined,
  );
}

describe('control lists · route guards', () => {
  it('the admin controller carries the switch, the session and the permission guards', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ControlListsAdminController,
    );
    expect(guards).toEqual([
      ControlListsEnabledGuard,
      JwtAuthGuard,
      PermissionGuard,
    ]);
  });

  it('no admin handler overrides or drops those guards', () => {
    const names = handlers(ControlListsAdminController);
    expect(names.length).toBeGreaterThan(10);
    for (const name of names) {
      expect([
        name,
        Reflect.getMetadata(
          GUARDS_METADATA,
          ControlListsAdminController.prototype[name],
        ),
      ]).toEqual([name, undefined]);
    }
  });

  it('every admin route lives under schema/ or data/, the two permission prefixes', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, ControlListsAdminController),
    ).toBe('admin');
    for (const name of handlers(ControlListsAdminController)) {
      const path = Reflect.getMetadata(
        PATH_METADATA,
        ControlListsAdminController.prototype[name],
      );
      expect([name, /^(schema|data)\//.test(path)]).toEqual([name, true]);
    }
  });

  it('the public controller only reads, behind the switch', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ControlListsPublicController),
    ).toEqual([ControlListsEnabledGuard]);
    for (const name of handlers(ControlListsPublicController)) {
      const method = Reflect.getMetadata(
        METHOD_METADATA,
        ControlListsPublicController.prototype[name],
      );
      expect([name, method]).toEqual([name, RequestMethod.GET]);
    }
  });
});
