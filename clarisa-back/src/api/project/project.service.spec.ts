import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectMappingRepository } from './repositories/project-mapping.repository';
import { ProjectRepository } from './repositories/project.repository';

describe('ProjectService', () => {
  let service: ProjectService;
  const projectRepositoryMock = {
    findAllWithRelations: jest.fn(),
  };
  const projectMappingRepositoryMock = {
    findFullByGlobalUnit: jest.fn(),
  };

  beforeEach(async () => {
    projectRepositoryMock.findAllWithRelations.mockReset();
    projectMappingRepositoryMock.findFullByGlobalUnit.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: ProjectRepository,
          useValue: projectRepositoryMock,
        },
        {
          provide: ProjectMappingRepository,
          useValue: projectMappingRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch all projects with relations', async () => {
    projectRepositoryMock.findAllWithRelations.mockResolvedValueOnce([]);

    const result = await service.findAll();

    expect(projectRepositoryMock.findAllWithRelations).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should throw for empty or blank official codes', async () => {
    await expect(service.findByGlobalUnit('')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.findByGlobalUnit('   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should delegate to repository when official code is valid', async () => {
    projectMappingRepositoryMock.findFullByGlobalUnit.mockResolvedValueOnce([]);

    const result = await service.findByGlobalUnit('SP01');

    expect(
      projectMappingRepositoryMock.findFullByGlobalUnit,
    ).toHaveBeenCalledWith('SP01');
    expect(result).toEqual([]);
  });

  it('should trim the official code before delegating', async () => {
    projectMappingRepositoryMock.findFullByGlobalUnit.mockResolvedValueOnce([]);

    await service.findByGlobalUnit('  SP01  ');

    expect(
      projectMappingRepositoryMock.findFullByGlobalUnit,
    ).toHaveBeenCalledWith('SP01');
  });
});
