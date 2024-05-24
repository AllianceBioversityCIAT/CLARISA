import { Test } from '@nestjs/testing';
import { ActionAreaService } from './action-area.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ActionAreaModule } from './action-area.module';
import { OrmConfigTestModule } from '../../shared/config/ormconfig.test.module';
import { ActionAreaDto } from './dto/action-area.dto';

describe('ActionAreaService', () => {
  let service: ActionAreaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [OrmConfigTestModule, ActionAreaModule],
    }).compile();

    service = moduleRef.get<ActionAreaService>(ActionAreaService);
  });

  describe('findAll', () => {
    it('should fail if the option parameter cannot be found on enum', () => {
      // Arrange
      const options: FindAllOptions = 999 as unknown as FindAllOptions;

      // Act
      const result = service.findAll(options);

      // Assert
      expect(result).rejects.toThrow('?!');
    });

    it('should return an array of ActionAreaDto', async () => {
      // Arrange
      const options: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE;

      // Act
      const result: ActionAreaDto[] = await service.findAll(options);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      if (result.length) {
        expect(result[0]).toBeInstanceOf(ActionAreaDto);
        expect(result[0].id).toBeDefined();
        expect(result[0].id).toBe('1');
      }
    });
  });

  describe('findOne', () => {
    it('should return an ActionAreaDto', async () => {
      // Arrange
      const id: number = 1;

      // Act
      const result: ActionAreaDto = await service.findOne(id);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(ActionAreaDto);
      expect(result.id).toBeDefined();
      expect(result.id).toBe(`${id}`);
    });
  });
});
