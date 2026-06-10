import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { QaApi } from './qa.api';
import { AppConfig } from '../../shared/utils/app-config';

describe('QaApi', () => {
  let service: QaApi;

  const mockHttpService: any = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  };

  const mockAppConfig: any = {
    qaUrl: 'http://mock-qa-url',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QaApi,
        { provide: HttpService, useValue: mockHttpService },
        { provide: AppConfig, useValue: mockAppConfig },
      ],
    }).compile();

    service = module.get<QaApi>(QaApi);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
