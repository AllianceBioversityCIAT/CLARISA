jest.mock('./utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));
jest.mock('./utils/DBAuth', () => ({
  DBAuth: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../api/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ModuleRef } from '@nestjs/core';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserService: any = {
    findOneByEmail: jest.fn(),
    findOneByUsername: jest.fn(),
  };

  const mockJwtService: any = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  const mockModuleRef: any = {
    get: jest.fn().mockReturnValue({
      authenticate: jest.fn().mockResolvedValue(true),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ModuleRef, useValue: mockModuleRef },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have methods', () => {
    expect(service).toBeTruthy();
  });

  it('should return a token on login', async () => {
    const mockUser = {
      id: 1,
      email: 'test@test.com',
      username: 'test',
      first_name: 'Test',
      last_name: 'User',
      permissions: [],
    } as any;

    const result = await service.login(mockUser);
    expect(result.access_token).toBe('mock-jwt-token');
    expect(mockJwtService.sign).toHaveBeenCalled();
  });

  it('should throw on validateUser when user not found', async () => {
    mockUserService.findOneByEmail.mockResolvedValue(null);
    mockUserService.findOneByUsername.mockResolvedValue(null);

    await expect(service.validateUser('test', 'pass')).rejects.toThrow();
  });
});

/**
 * What the API answers when the credentials do not work.
 *
 * 🛑 Measured before the fix (clarisatest, 2026-09-16): a login that does not
 * exist answered **401**, and an existing login with the wrong password answered
 * **500** (`SERVER_NOT_FOUND: There was an internal server error: Invalid
 * Credentials`). Two different answers, so the response told anyone who asked
 * which logins are real — and the most common failure of all was published as a
 * server fault.
 */
describe('AuthService · credenciales inválidas', () => {
  let service: AuthService;

  const mockUserService: any = {
    findOneByEmail: jest.fn(),
    findOneByUsername: jest.fn(),
  };

  const authenticator = { authenticate: jest.fn() };

  const mockModuleRef: any = { get: jest.fn().mockReturnValue(authenticator) };

  const existingUser = {
    id: 7,
    email: 'y.zuniga@cgiar.org',
    username: 'y.zuniga',
    is_cgiar_user: true,
  } as any;

  /** The exception `validateUser` throws, or a failure if it throws nothing. */
  const failureOf = async (login = 'y.zuniga'): Promise<HttpException> => {
    try {
      await service.validateUser(login, 'whatever');
    } catch (error) {
      return error as HttpException;
    }

    throw new Error('validateUser resolved where it had to reject');
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('token') },
        },
        { provide: ModuleRef, useValue: mockModuleRef },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  /** Nobody with that login. */
  const noSuchUser = () => {
    mockUserService.findOneByEmail.mockResolvedValue(null);
    mockUserService.findOneByUsername.mockResolvedValue(null);
  };

  /** The user is real; the authenticator decides. */
  const userExists = () => {
    mockUserService.findOneByEmail.mockResolvedValue(existingUser);
    mockUserService.findOneByUsername.mockResolvedValue(existingUser);
  };

  it('answers 401, not 500, to an existing user with the wrong password', async () => {
    userExists();
    // What `LDAPAuth` rejects with once the directory says «that is not the
    // password»; before the fix this arrived as a 500 named SERVER_NOT_FOUND.
    authenticator.authenticate.mockRejectedValue({
      name: 'INVALID_CREDENTIALS',
      description: 'The supplied credentials are invalid',
      httpCode: HttpStatus.UNAUTHORIZED,
    });

    const failure = await failureOf();

    expect(failure.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(JSON.stringify(failure.getResponse())).not.toMatch(
      /internal server error/i,
    );
  });

  // `DBAuth` *resolves* its failure DTO instead of rejecting it, and that used
  // to fall through `validateUser` returning `undefined`: the answer then came
  // from the passport guard as a bare `Unauthorized`, a third different body.
  it('answers 401 when the authenticator resolves a failure instead of rejecting', async () => {
    userExists();
    authenticator.authenticate.mockResolvedValue({
      name: 'INVALID_CREDENTIALS',
      description: 'The supplied credentials are invalid',
      httpCode: 401,
    });

    const failure = await failureOf();

    expect(failure.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
  });

  // The security half: «no such user» and «wrong password» have to be one and
  // the same answer, or the login form becomes an account directory.
  it('answers exactly the same thing whether the user exists or not', async () => {
    noSuchUser();
    const unknown = await failureOf('ghost');

    userExists();
    authenticator.authenticate.mockResolvedValue({
      name: 'INVALID_CREDENTIALS',
      description: 'The supplied credentials are invalid',
      httpCode: 401,
    });
    const wrongPassword = await failureOf();

    expect(wrongPassword.getStatus()).toBe(unknown.getStatus());
    expect(wrongPassword.getResponse()).toEqual(unknown.getResponse());
    expect(JSON.stringify(unknown.getResponse())).not.toMatch(
      /user|account|exist/i,
    );
  });

  // And the other half: a directory that is down is still a 500. Answering 401
  // there would send the person to retype a password that was never the problem.
  it('does not hide a real server failure behind a 401', async () => {
    userExists();
    authenticator.authenticate.mockRejectedValue({
      name: 'SERVER_NOT_FOUND',
      description: 'Server not found',
      httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });

    expect((await failureOf()).getStatus()).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  // `err.httpCode` went straight into `HttpException`, so anything that was not
  // a `BaseMessageDTO` produced an exception with an undefined status.
  it('gives an unexpected throw a real status', async () => {
    userExists();
    authenticator.authenticate.mockRejectedValue(new TypeError('boom'));

    expect((await failureOf()).getStatus()).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('still lets a valid password through', async () => {
    userExists();
    authenticator.authenticate.mockResolvedValue(true);

    await expect(service.validateUser('y.zuniga', 'right')).resolves.toBe(
      existingUser,
    );
  });
});
