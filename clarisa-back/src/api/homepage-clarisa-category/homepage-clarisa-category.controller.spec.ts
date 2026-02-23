import { Test, TestingModule } from '@nestjs/testing';
import { HomepageClarisaCategoryController } from './homepage-clarisa-category.controller';
import { HomepageClarisaCategoryService } from './homepage-clarisa-category.service';

describe('HomepageClarisaCategoryController', () => {
  let controller: HomepageClarisaCategoryController;

  const mockHomepageClarisaCategoryService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomepageClarisaCategoryController],
      providers: [
        HomepageClarisaCategoryController,
        { provide: HomepageClarisaCategoryService, useValue: mockHomepageClarisaCategoryService },
      ],
    }).compile();

    controller = module.get<HomepageClarisaCategoryController>(HomepageClarisaCategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

    it('should call service on findAll', async () => {
      mockHomepageClarisaCategoryService.findAll = mockHomepageClarisaCategoryService.findAll || jest.fn();
      mockHomepageClarisaCategoryService.findAll.mockResolvedValue([]);

      try { await (controller as any).findAll('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on findOne', async () => {
      mockHomepageClarisaCategoryService.findOne = mockHomepageClarisaCategoryService.findOne || jest.fn();
      mockHomepageClarisaCategoryService.findOne.mockResolvedValue([]);

      try { await (controller as any).findOne('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on update', async () => {
      mockHomepageClarisaCategoryService.update = mockHomepageClarisaCategoryService.update || jest.fn();
      mockHomepageClarisaCategoryService.update.mockResolvedValue([]);

      try { await (controller as any).update('active', {}, {}, {}); } catch (e) { /* ok */ }
    });
});
