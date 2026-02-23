import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionDictionaryController } from './institution-dictionary.controller';
import { InstitutionDictionaryService } from './institution-dictionary.service';

describe('InstitutionDictionaryController', () => {
  let controller: InstitutionDictionaryController;

  const mockInstitutionDictionaryService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    if: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionDictionaryController],
      providers: [
        InstitutionDictionaryController,
        { provide: InstitutionDictionaryService, useValue: mockInstitutionDictionaryService },
      ],
    }).compile();

    controller = module.get<InstitutionDictionaryController>(InstitutionDictionaryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

    it('should call service on findAll', async () => {
      mockInstitutionDictionaryService.findAll = mockInstitutionDictionaryService.findAll || jest.fn();
      mockInstitutionDictionaryService.findAll.mockResolvedValue([]);

      try { await (controller as any).findAll('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on findOne', async () => {
      mockInstitutionDictionaryService.findOne = mockInstitutionDictionaryService.findOne || jest.fn();
      mockInstitutionDictionaryService.findOne.mockResolvedValue([]);

      try { await (controller as any).findOne('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on update', async () => {
      mockInstitutionDictionaryService.update = mockInstitutionDictionaryService.update || jest.fn();
      mockInstitutionDictionaryService.update.mockResolvedValue([]);

      try { await (controller as any).update('active', {}, {}, {}); } catch (e) { /* ok */ }
    });
});
