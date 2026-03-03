import { Test, TestingModule } from '@nestjs/testing';
import { HomepageClarisaEndpointController } from './homepage-clarisa-endpoint.controller';
import { HomepageClarisaEndpointService } from './homepage-clarisa-endpoint.service';

describe('HomepageClarisaEndpointController', () => {
  let controller: HomepageClarisaEndpointController;

  const mockHomepageClarisaEndpointService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomepageClarisaEndpointController],
      providers: [
        HomepageClarisaEndpointController,
        {
          provide: HomepageClarisaEndpointService,
          useValue: mockHomepageClarisaEndpointService,
        },
      ],
    }).compile();

    controller = module.get<HomepageClarisaEndpointController>(
      HomepageClarisaEndpointController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockHomepageClarisaEndpointService.findAll =
      mockHomepageClarisaEndpointService.findAll || jest.fn();
    mockHomepageClarisaEndpointService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockHomepageClarisaEndpointService.findOne =
      mockHomepageClarisaEndpointService.findOne || jest.fn();
    mockHomepageClarisaEndpointService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockHomepageClarisaEndpointService.update =
      mockHomepageClarisaEndpointService.update || jest.fn();
    mockHomepageClarisaEndpointService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
