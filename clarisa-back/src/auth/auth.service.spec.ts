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
