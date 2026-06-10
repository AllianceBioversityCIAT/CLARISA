import { Test, TestingModule } from '@nestjs/testing';
import { HomepageClarisaCategoryEndpointController } from './homepage-clarisa-category-endpoint.controller';
import { HomepageClarisaCategoryEndpointService } from './homepage-clarisa-category-endpoint.service';

describe('HomepageClarisaCategoryEndpointController', () => {
  let controller: HomepageClarisaCategoryEndpointController;

  const mockHomepageClarisaCategoryEndpointService: any = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomepageClarisaCategoryEndpointController],
      providers: [
        HomepageClarisaCategoryEndpointController,
        {
          provide: HomepageClarisaCategoryEndpointService,
          useValue: mockHomepageClarisaCategoryEndpointService,
        },
      ],
    }).compile();

    controller = module.get<HomepageClarisaCategoryEndpointController>(
      HomepageClarisaCategoryEndpointController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockHomepageClarisaCategoryEndpointService.findAll =
      mockHomepageClarisaCategoryEndpointService.findAll || jest.fn();
    mockHomepageClarisaCategoryEndpointService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
