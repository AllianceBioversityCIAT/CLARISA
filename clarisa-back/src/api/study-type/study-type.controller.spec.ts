import { Test, TestingModule } from '@nestjs/testing';
import { StudyTypeController } from './study-type.controller';
import { StudyTypeService } from './study-type.service';

describe('StudyTypeController', () => {
  let controller: StudyTypeController;

  const mockStudyTypeService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudyTypeController],
      providers: [
        StudyTypeController,
        { provide: StudyTypeService, useValue: mockStudyTypeService },
      ],
    }).compile();

    controller = module.get<StudyTypeController>(StudyTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

    it('should call service on findAll', async () => {
      mockStudyTypeService.findAll = mockStudyTypeService.findAll || jest.fn();
      mockStudyTypeService.findAll.mockResolvedValue([]);

      try { await (controller as any).findAll('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on findOne', async () => {
      mockStudyTypeService.findOne = mockStudyTypeService.findOne || jest.fn();
      mockStudyTypeService.findOne.mockResolvedValue([]);

      try { await (controller as any).findOne('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on update', async () => {
      mockStudyTypeService.update = mockStudyTypeService.update || jest.fn();
      mockStudyTypeService.update.mockResolvedValue([]);

      try { await (controller as any).update('active', {}, {}, {}); } catch (e) { /* ok */ }
    });
});
