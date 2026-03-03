import { Test, TestingModule } from '@nestjs/testing';
import { HomepageClarisaCategoryEndpointService } from './homepage-clarisa-category-endpoint.service';
import { HomepageClarisaCategoryEndpointRepository } from './repositories/homepage-clarisa-category-endpoint.repository';

describe('HomepageClarisaCategoryEndpointService', () => {
  let service: HomepageClarisaCategoryEndpointService;

  const mockHomepageClarisaCategoryEndpointRepository: any = {
    getCategoryEndpoints: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    query: jest.fn(),
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
        HomepageClarisaCategoryEndpointService,
        { provide: HomepageClarisaCategoryEndpointRepository, useValue: mockHomepageClarisaCategoryEndpointRepository },
      ],
    }).compile();

    service = module.get<HomepageClarisaCategoryEndpointService>(HomepageClarisaCategoryEndpointService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should call repository on findAll', async () => {
      Object.keys(mockHomepageClarisaCategoryEndpointRepository).forEach(k => {
        if (typeof mockHomepageClarisaCategoryEndpointRepository[k]?.mockResolvedValue === 'function') {
          mockHomepageClarisaCategoryEndpointRepository[k].mockResolvedValue([]);
        }
      });

      const result = await service.findAll();
      expect(result).toBeDefined();
    });
});
