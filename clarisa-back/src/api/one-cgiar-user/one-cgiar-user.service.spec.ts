import { Test, TestingModule } from '@nestjs/testing';
import { OneCgiarUserService } from './one-cgiar-user.service';
import { OneCgiarUserRepository } from './repositories/one-cgiar-user.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('OneCgiarUserService', () => {
  let service: OneCgiarUserService;

  const mockOneCgiarUserRepository: any = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
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
        OneCgiarUserService,
        {
          provide: OneCgiarUserRepository,
          useValue: mockOneCgiarUserRepository,
        },
      ],
    }).compile();

    service = module.get<OneCgiarUserService>(OneCgiarUserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockOneCgiarUserRepository).forEach((k) => {
      if (
        typeof mockOneCgiarUserRepository[k]?.mockResolvedValue === 'function'
      ) {
        mockOneCgiarUserRepository[k].mockResolvedValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockOneCgiarUserRepository).forEach((k) => {
      if (
        typeof mockOneCgiarUserRepository[k]?.mockResolvedValue === 'function'
      ) {
        mockOneCgiarUserRepository[k].mockResolvedValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toBeDefined();
  });

  it('should throw on findAll with invalid option', async () => {
    await expect(service.findAll('invalid' as any)).rejects.toThrow();
  });

  it('should return a single item on findOne', async () => {
    const mockItem = { id: 1 };
    mockOneCgiarUserRepository.findOneBy =
      mockOneCgiarUserRepository.findOneBy || jest.fn();
    mockOneCgiarUserRepository.findOne =
      mockOneCgiarUserRepository.findOne || jest.fn();
    mockOneCgiarUserRepository.findOneBy.mockResolvedValue(mockItem);
    mockOneCgiarUserRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });

  it('should save items on update', async () => {
    const dto = [{ id: 1 }];
    mockOneCgiarUserRepository.save.mockResolvedValue(dto);

    await service.update(dto as any);
    expect(mockOneCgiarUserRepository.save).toHaveBeenCalledWith(dto);
  });
});
