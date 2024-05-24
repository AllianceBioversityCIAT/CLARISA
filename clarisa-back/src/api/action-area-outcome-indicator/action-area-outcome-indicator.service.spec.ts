import { Test, TestingModule } from '@nestjs/testing';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { OrmConfigTestModule } from '../../shared/config/ormconfig.test.module';
import { ActionAreaOutcomeIndicatorService } from './action-area-outcome-indicator.service';
import { ActionAreaOutcomeIndicatorModule } from './action-area-outcome-indicator.module';
import { ActionAreaOutcomeIndicatorDto } from './dto/action-area-outcome-indicator.dto';
import { ActionAreaOutcomeIndicator } from './entities/action-area-outcome-indicator.entity';

describe('ActionAreaOutcomeIndicatorService', () => {
  let service: ActionAreaOutcomeIndicatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [OrmConfigTestModule, ActionAreaOutcomeIndicatorModule],
      providers: [],
    }).compile();

    service = module.get<ActionAreaOutcomeIndicatorService>(
      ActionAreaOutcomeIndicatorService,
    );
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

    it('should return an array of ActionAreaOutcomeIndicatorDto', async () => {
      // Arrange
      const options: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE;

      // Act
      const result: ActionAreaOutcomeIndicatorDto[] =
        await service.findAll(options);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      if (result.length) {
        expect(result[0]).toBeInstanceOf(ActionAreaOutcomeIndicatorDto);
        expect(result[0].actionAreaOutcomeIndicatorId).toBeDefined();
        expect(result[0].actionAreaOutcomeIndicatorId).toBe('1');
      }
    });
  });

  describe('findOne', () => {
    it('should return an ActionAreaOutcomeIndicator', async () => {
      // Arrange
      const id: number = 1;

      // Act
      const result: ActionAreaOutcomeIndicator = await service.findOne(id);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(ActionAreaOutcomeIndicatorDto);
      expect(result.id).toBeDefined();
      expect(result.id).toBe(`${id}`);
    });
  });
});
