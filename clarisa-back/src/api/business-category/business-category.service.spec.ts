import { Test, TestingModule } from '@nestjs/testing';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { OrmConfigTestModule } from '../../shared/config/ormconfig.test.module';
import { BusinessCategoryService } from './business-category.service';
import { BusinessCategoryModule } from './business-category.module';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic-dto.v1';

describe('BusinessCategoryService', () => {
  let service: BusinessCategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [OrmConfigTestModule, BusinessCategoryModule],
      providers: [],
    }).compile();

    service = module.get<BusinessCategoryService>(BusinessCategoryService);
  }, 10000);

  describe('findAll', () => {
    it('should fail if the option parameter cannot be found on enum', () => {
      // Arrange
      const options: FindAllOptions = 999 as unknown as FindAllOptions;

      // Act
      const result = service.findAll(options);

      // Assert
      expect(result).rejects.toThrow('?!');
    });

    it('should return an array of BasicDtoV1', async () => {
      // Arrange
      const options: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE;

      // Act
      const result: BasicDtoV1[] = await service.findAll(options);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      if (result.length) {
        expect(result[0]).toBeInstanceOf(BasicDtoV1);
        expect(result[0].id).toBeDefined();
        expect(result[0].id).toBe('1');
      }
    });
  });

  describe('findOne', () => {
    it('should return an BasicDtoV1', async () => {
      // Arrange
      const id: number = 1;

      // Act
      const result: BasicDtoV1 = await service.findOne(id);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(BasicDtoV1);
      expect(result.id).toBeDefined();
      expect(result.id).toBe(`${id}`);
    });
  });
});
