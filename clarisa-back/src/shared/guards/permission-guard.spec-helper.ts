import { ExecutionContext } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';

/**
 * The real PermissionGuard (path substring match) for a user who holds
 * exactly `permissions`, and the request context of a URL — shared by the
 * specs that pin which routes a seeded permission opens.
 */
export function permissionGuardFor(
  permissions: string[],
  email = 'someone@clarisa.test',
): PermissionGuard {
  const users = {
    findOneByEmail: jest.fn(async () => ({ id: 9, email, permissions })),
  };
  const moduleRef = { get: () => users } as unknown as ModuleRef;
  const reflector = { get: () => undefined } as unknown as Reflector;
  return new PermissionGuard(reflector, moduleRef);
}

export function requestTo(
  url: string,
  email = 'someone@clarisa.test',
): ExecutionContext {
  return {
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ user: { email }, originalUrl: url }),
    }),
  } as unknown as ExecutionContext;
}
