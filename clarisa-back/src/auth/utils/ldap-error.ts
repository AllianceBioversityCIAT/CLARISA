import { HttpStatus } from '@nestjs/common';
import { BaseMessageDTO } from './BaseMessageDTO';

/**
 * What a failed LDAP bind actually means, as a DTO.
 *
 * 🛑 This is the fix for the defect that made an existing user with the wrong
 * password reach every consumer of the API as HTTP **500**
 * (`SERVER_NOT_FOUND: There was an internal server error: Invalid Credentials`).
 * The directory reports «that is not the password» through the same error
 * channel as «I am unreachable», and the previous code wrapped both as an
 * internal error.
 *
 * It lives in its own file so it can be tested: `LDAPAuth` imports
 * `src/shared/config/config`, which is **not in the repository** (only its
 * `.example`), so no spec can import that class — not locally and not in CI.
 */
export function describeLdapFailure(err: unknown): BaseMessageDTO {
  // No error object and no session: the bind was refused. That is a credential
  // failure, and it used to be reported as INVALID_CREDENTIALS with a 500.
  if (!err || isInvalidCredentialsError(err)) {
    return invalidCredentials();
  }

  const failure = err as { errno?: string; lde_message?: string };

  if (failure.errno == 'ENOTFOUND') {
    return {
      name: 'SERVER_NOT_FOUND',
      description: 'Server not found',
      httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }

  return {
    name: 'SERVER_NOT_FOUND',
    description: `There was an internal server error: ${failure.lde_message}`,
    httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
  };
}

/** 401, worded so it never says whether the account exists. */
export function invalidCredentials(): BaseMessageDTO {
  return {
    name: 'INVALID_CREDENTIALS',
    description: 'The supplied credentials are invalid',
    httpCode: HttpStatus.UNAUTHORIZED,
  };
}

/**
 * Whether an LDAP error means «that is not the password».
 *
 * Three signals, because the directory does not always send the same one: the
 * LDAP result code `49` (`invalidCredentials`, RFC 4511 §4.1.9), the ldapjs
 * error name, and the human message — Active Directory hides the real reason in
 * `data 52e` inside it, and the deployment CLARISA talks to answers a plain
 * `Invalid Credentials`.
 *
 * 🛑 Anything else keeps its 500 on purpose: telling someone whose directory is
 * down that their password is wrong sends them to retype a password that was
 * never the problem.
 */
export function isInvalidCredentialsError(err: unknown): boolean {
  const failure = err as {
    code?: number | string;
    name?: string;
    lde_message?: string;
    message?: string;
  };

  const message = `${failure?.lde_message ?? ''} ${failure?.message ?? ''}`;

  return (
    failure?.code === 49 ||
    failure?.name === 'InvalidCredentialsError' ||
    /invalid\s*credentials/i.test(message) ||
    /data 52e/i.test(message)
  );
}
