import { Test, TestingModule } from '@nestjs/testing';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { OrmConfigTestModule } from '../../shared/config/ormconfig.test.module';
import { CenterService } from './center.service';
import { CenterModule } from './center.module';
import { CenterDtoV1 } from './dto/center.v1.dto';
import { CgiarEntityTypeModule } from '../cgiar-entity-type/cgiar-entity-type.module';
import { CgiarEntityTypeRepository } from '../cgiar-entity-type/repositories/cgiar-entity-type.repository';

describe('CenterService', () => {
  let service: CenterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [OrmConfigTestModule, CenterModule, CgiarEntityTypeModule],
      providers: [],
    }).compile();

    service = module.get<CenterService>(CenterService);
  }, 10000);

  describe('findAllV1', () => {
    it('should throw an error if the center type cannot be found', async () => {
      // Arrange
      const options: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE;

      // Act
      service = (
        await Test.createTestingModule({
          imports: [OrmConfigTestModule, CenterModule, CgiarEntityTypeModule],
          providers: [
            {
              provide: CgiarEntityTypeRepository,
              useValue: {
                findOneBy: jest.fn().mockResolvedValue(undefined),
              },
            },
          ],
        }).compile()
      ).get<CenterService>(CenterService);
      const result = service.findAllV1(options);

      // Assert
      expect(result).rejects.toThrow('Center type not found?!');
    });

    it('should fail if the option parameter cannot be found on enum', () => {
      // Arrange
      const options: FindAllOptions = 999 as unknown as FindAllOptions;

      // Act
      const result = service.findAllV1(options);

      // Assert
      expect(result).rejects.toThrow('?!');
    });

    it('should return an array of CenterDtoV1', async () => {
      // Arrange
      const options: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE;

      // Act
      const result: CenterDtoV1[] = await service.findAllV1(options);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      if (result.length) {
        expect(result[0]).toBeInstanceOf(CenterDtoV1);
        expect(result[0].code).toBeDefined();
        expect(result[0].code).toBe('1');
      }
    });

    it('should have a center as its type', async () => {
      // Arrange
      const options: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE;
      const name = 'center';

      // Act
      const result: CenterDtoV1[] = await service.findAllV1(options);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      if (result.length) {
        expect(result[0]).toBeInstanceOf(CenterDtoV1);
        expect(result[0].code).toBeDefined();
        expect(result[0].cgiarEntityTypeDTO).toBeDefined();
        expect(result[0].cgiarEntityTypeDTO.name).toBeDefined();
        expect(result[0].cgiarEntityTypeDTO.name).toContain(name);
      }
    });
  });

  describe('findOneV1', () => {
    it('should throw an error if the center type cannot be found', async () => {
      // Arrange
      const id: number = 1;

      // Act
      service = (
        await Test.createTestingModule({
          imports: [OrmConfigTestModule, CenterModule, CgiarEntityTypeModule],
          providers: [
            {
              provide: CgiarEntityTypeRepository,
              useValue: {
                findOneBy: jest.fn().mockResolvedValue(undefined),
              },
            },
          ],
        }).compile()
      ).get<CenterService>(CenterService);
      const result = service.findOneV1(id);

      // Assert
      expect(result).rejects.toThrow('Center type not found?!');
    });

    it('should return an CenterDtoV1', async () => {
      // Arrange
      const id: number = 1;

      // Act
      const result: CenterDtoV1 = await service.findOneV1(id);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(CenterDtoV1);
      expect(result.code).toBeDefined();
      expect(result.code).toBe(`${id}`);
    });

    it('should have a center as its type', async () => {
      // Arrange
      const id: number = 1;
      const name = 'center';

      // Act
      const result: CenterDtoV1 = await service.findOneV1(id);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(CenterDtoV1);
      expect(result.code).toBeDefined();
      expect(result.cgiarEntityTypeDTO).toBeDefined();
      expect(result.cgiarEntityTypeDTO.name).toBeDefined();
      expect(result.cgiarEntityTypeDTO.name).toContain(name);
    });
  });
});
