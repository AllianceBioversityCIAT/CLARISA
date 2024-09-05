import { Test, TestingModule } from '@nestjs/testing';
import { QaApi } from './qa.api';

describe('QaService', () => {
  let service: QaApi;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QaApi],
    }).compile();

    service = module.get<QaApi>(QaApi);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
