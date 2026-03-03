import { Test, TestingModule } from '@nestjs/testing';
import { QaTokenAuthService } from './qa-token-auth.service';
import { QaApi } from '../../integration/qa/qa.api';
import { QaTokenAuthRepository } from './repositories/qa-token-auth.repository';

describe('QaTokenAuthService', () => {
  let service: QaTokenAuthService;

  const mockQaApi: any = {
    postQaToken: jest.fn(),
  };

  const mockQaTokenAuthRepository: any = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    query: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getRawOne: jest.fn().mockResolvedValue({}),
      getRawMany: jest.fn().mockResolvedValue([]),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QaTokenAuthService,
        { provide: QaApi, useValue: mockQaApi },
        { provide: QaTokenAuthRepository, useValue: mockQaTokenAuthRepository },
      ],
    }).compile();

    service = module.get<QaTokenAuthService>(QaTokenAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call repository on findAll', async () => {
    Object.keys(mockQaTokenAuthRepository).forEach((k) => {
      if (
        typeof mockQaTokenAuthRepository[k]?.mockResolvedValue === 'function'
      ) {
        mockQaTokenAuthRepository[k].mockResolvedValue([]);
      }
    });

    const result = await service.findAll();
    expect(result).toBeDefined();
  });

  it('should return a single item on findOne', async () => {
    const mockItem = { id: 1 };
    mockQaTokenAuthRepository.findOneBy =
      mockQaTokenAuthRepository.findOneBy || jest.fn();
    mockQaTokenAuthRepository.findOne =
      mockQaTokenAuthRepository.findOne || jest.fn();
    mockQaTokenAuthRepository.findOneBy.mockResolvedValue(mockItem);
    mockQaTokenAuthRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });
});
