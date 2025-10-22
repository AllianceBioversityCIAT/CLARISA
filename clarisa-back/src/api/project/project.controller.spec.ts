import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

describe('ProjectController', () => {
  let controller: ProjectController;
  let service: ProjectService;

  const projectServiceMock = {
    findAll: jest.fn(),
    findByGlobalUnit: jest.fn(),
  };

  beforeEach(async () => {
    projectServiceMock.findAll.mockReset();
    projectServiceMock.findByGlobalUnit.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        {
          provide: ProjectService,
          useValue: projectServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ProjectController>(ProjectController);
    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    projectServiceMock.findAll.mockResolvedValueOnce([]);

    await controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
  });

  it('should call service on findByGlobalUnit', async () => {
    projectServiceMock.findByGlobalUnit.mockResolvedValueOnce([]);

    await controller.findByGlobalUnit('SP01');

    expect(service.findByGlobalUnit).toHaveBeenCalledWith('SP01');
  });
});
