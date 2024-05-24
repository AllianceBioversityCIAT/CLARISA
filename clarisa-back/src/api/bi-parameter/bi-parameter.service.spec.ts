import { Test, TestingModule } from '@nestjs/testing';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { OrmConfigTestModule } from '../../shared/config/ormconfig.test.module';
import { BiParameterService } from './bi-parameter.service';
import { BiParameterModule } from './bi-parameter.module';
import { BiParameter } from './entities/bi-parameter.entity';
import { ParametersBiUnit } from './dto/parameter-unit-bi.dto';

describe('BiParameterService', () => {
  let service: BiParameterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [OrmConfigTestModule, BiParameterModule],
      providers: [],
    }).compile();

    service = module.get<BiParameterService>(BiParameterService);
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

    it('should return an array of BiParameter', async () => {
      // Arrange
      const options: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE;

      // Act
      const result: BiParameter[] = await service.findAll(options);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      if (result.length) {
        expect(result[0]).toBeInstanceOf(BiParameter);
        expect(result[0].id).toBeDefined();
        expect(result[0].id).toBe('1');
      }
    });
  });

  describe('findOne', () => {
    it('should return an BiParameter', async () => {
      // Arrange
      const id: number = 1;

      // Act
      const result: BiParameter = await service.findOne(id);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(BiParameter);
      expect(result.id).toBeDefined();
      expect(result.id).toBe(`${id}`);
    });
  });

  describe('findAllUnitParametersBi', () => {
    it('should return an ParametersBiUnit', async () => {
      // Arrange

      // Act
      const result: ParametersBiUnit = await service.findAllUnitParametersBi();

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(ParametersBiUnit);
    });

    it('should contain all the parameters from the array', async () => {
      // Arrange
      const parameters: string[] = [
        'api_token_url',
        'azure_api_url',
        'tenant_id',
        'secret',
        'app_id',
        'resource_url',
        'config_id',
        'embed_url_base',
      ];
      const foundParameters: string[] = [];

      // Act
      const result: ParametersBiUnit = await service.findAllUnitParametersBi();
      foundParameters.push(...Object.keys(result));

      expect(foundParameters.length).toBe(parameters.length);
      for (const foundParameter of foundParameters) {
        expect(parameters).toContain(foundParameter);
      }

      for (const parameter of parameters) {
        expect(foundParameters).toContain(parameter);
      }

      for (const parameter of parameters) {
        expect(result[parameter]).toBeDefined();
      }
    });
  });
});
