import { HttpStatus } from '@nestjs/common';
import {
  describeLdapFailure,
  invalidCredentials,
  isInvalidCredentialsError,
} from './ldap-error';

/**
 * The measurement this fixes (clarisatest, 2026-09-16): an **existing** user with
 * the wrong password got HTTP 500 and
 * `{"name":"SERVER_NOT_FOUND","description":"There was an internal server error:
 * Invalid Credentials"}`. Only a user that does not exist got a 401 — so the
 * most common failure of all reached every consumer as «CLARISA is broken».
 */
describe('describeLdapFailure', () => {
  it('answers 401 to the payload the directory sends for a wrong password', () => {
    const failure = describeLdapFailure({
      lde_message: 'Invalid Credentials',
      code: 49,
    });

    expect(failure.httpCode).toBe(HttpStatus.UNAUTHORIZED);
    expect(failure.name).toBe('INVALID_CREDENTIALS');
    expect(failure.description).not.toMatch(/internal server error/i);
  });

  it.each([
    ['the LDAP result code alone', { code: 49 }],
    ['the ldapjs error name', { name: 'InvalidCredentialsError' }],
    [
      'the Active Directory sub-status buried in the message',
      {
        lde_message:
          '80090308: LdapErr: DSID-0C09042A, comment: AcceptSecurityContext error, data 52e, v3839',
      },
    ],
    ['a message in another casing', { message: 'invalid credentials' }],
  ])('recognises a rejected password by %s', (_label, err) => {
    expect(describeLdapFailure(err)).toEqual({
      name: 'INVALID_CREDENTIALS',
      description: 'The supplied credentials are invalid',
      httpCode: HttpStatus.UNAUTHORIZED,
    });
  });

  // A refused bind with no error object at all: this branch already said
  // INVALID_CREDENTIALS and still carried a 500.
  it.each([[null], [undefined]])(
    'answers 401 when the bind is refused with no error (%p)',
    (err) => {
      expect(describeLdapFailure(err).httpCode).toBe(HttpStatus.UNAUTHORIZED);
    },
  );

  // The other half of the fix, and the reason this is not «401 for everything».
  it('keeps 500, and the wording, for a directory that cannot be reached', () => {
    expect(describeLdapFailure({ errno: 'ENOTFOUND' })).toEqual({
      name: 'SERVER_NOT_FOUND',
      description: 'Server not found',
      httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });

  it('keeps 500 for any other directory failure', () => {
    const failure = describeLdapFailure({ lde_message: 'Operations error' });

    expect(failure.httpCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(failure.name).toBe('SERVER_NOT_FOUND');
    expect(failure.description).toContain('Operations error');
  });

  it('never leaks whether the account exists', () => {
    expect(invalidCredentials().description).not.toMatch(/user|account|login/i);
  });
});

describe('isInvalidCredentialsError', () => {
  it('does not mistake an unrelated failure for a bad password', () => {
    expect(isInvalidCredentialsError({ lde_message: 'Busy' })).toBe(false);
    expect(isInvalidCredentialsError(new Error('socket hang up'))).toBe(false);
    expect(isInvalidCredentialsError(undefined)).toBe(false);
  });
});
