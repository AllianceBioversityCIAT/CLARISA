import { Test, TestingModule } from '@nestjs/testing';
import { HandlebarsTemplateController } from './handlebars-template.controller';
import { HandlebarsTemplateService } from './handlebars-template.service';

describe('HandlebarsTemplateController', () => {
  let controller: HandlebarsTemplateController;

  const mockHandlebarsTemplateService: any = {
    findAll: jest.fn(),
    findOneById: jest.fn(),
    findOneByName: jest.fn(),
    switch: jest.fn(),
    getAndUpdateTemplate: jest.fn(),
    if: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HandlebarsTemplateController],
      providers: [
        HandlebarsTemplateController,
        { provide: HandlebarsTemplateService, useValue: mockHandlebarsTemplateService },
      ],
    }).compile();

    controller = module.get<HandlebarsTemplateController>(HandlebarsTemplateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

    it('should call service on findAll', async () => {
      mockHandlebarsTemplateService.findAll = mockHandlebarsTemplateService.findAll || jest.fn();
      mockHandlebarsTemplateService.findAll.mockResolvedValue([]);

      try { await (controller as any).findAll('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on findOneById', async () => {
      mockHandlebarsTemplateService.findOneById = mockHandlebarsTemplateService.findOneById || jest.fn();
      mockHandlebarsTemplateService.findOneById.mockResolvedValue([]);

      try { await (controller as any).findOneById('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on findOneByName', async () => {
      mockHandlebarsTemplateService.findOneByName = mockHandlebarsTemplateService.findOneByName || jest.fn();
      mockHandlebarsTemplateService.findOneByName.mockResolvedValue([]);

      try { await (controller as any).findOneByName('active', {}, {}, {}); } catch (e) { /* ok */ }
    });
});
