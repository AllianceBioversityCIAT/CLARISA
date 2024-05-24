import { Test, TestingModule } from '@nestjs/testing';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { OrmConfigTestModule } from '../../shared/config/ormconfig.test.module';
import { ActionAreaOutcomeService } from './action-area-outcome.service';
import { ActionAreaOutcomeModule } from './action-area-outcome.module';
import { ActionAreaOutcomeDto } from './dto/action-area-outcome.dto';
import { ActionAreaOutcome } from './entities/action-area-outcome.entity';
import { ActionAreaOutcomeIndicatorModule } from '../action-area-outcome-indicator/action-area-outcome-indicator.module';

describe('ActionAreaOutcomeService', () => {
  let service: ActionAreaOutcomeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        OrmConfigTestModule,
        ActionAreaOutcomeModule,
        ActionAreaOutcomeIndicatorModule,
      ],
      providers: [],
    }).compile();

    service = module.get<ActionAreaOutcomeService>(ActionAreaOutcomeService);
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

    it('should return an array of ActionAreaOutcomeDto', async () => {
      // Arrange
      const options: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE;

      // Act
      const result: ActionAreaOutcomeDto[] = await service.findAll(options);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      if (result.length) {
        expect(result[0]).toBeInstanceOf(ActionAreaOutcomeDto);
        expect(result[0].id).toBeDefined();
        expect(result[0].id).toBe('1');
      }
    });
  });

  describe('findOne', () => {
    it('should return an ActionAreaOutcome', async () => {
      // Arrange
      const id: number = 1;

      // Act
      const result: ActionAreaOutcome = await service.findOne(id);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(ActionAreaOutcomeDto);
      expect(result.id).toBeDefined();
      expect(result.id).toBe(`${id}`);
    });
  });
});
