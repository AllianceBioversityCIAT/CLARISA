jest.mock('./utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));
jest.mock('./utils/DBAuth', () => ({
  DBAuth: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService: any = {
    login: jest.fn(),
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call authService.login on login', async () => {
    const mockUser = { id: 1, email: 'test@test.com' };
    const mockReq = { user: mockUser };
    mockAuthService.login.mockResolvedValue({ access_token: 'token' });

    const result = await controller.login(mockReq);
    expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
    expect(result).toEqual({ access_token: 'token' });
  });
});
