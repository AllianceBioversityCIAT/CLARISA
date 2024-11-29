import { Test, TestingModule } from '@nestjs/testing';
import { AccountTypeController } from './account-type.controller';
import { AccountTypeService } from './account-type.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateAccountTypeDto } from './dto/update-account-type.dto';
import { AccountType } from './entities/account-type.entity';
import { AccountTypeDto } from './dto/account-type.dto';

describe('AccountTypeController', () => {
  let controller: AccountTypeController;
  let service: AccountTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountTypeController],
      providers: [
        {
          provide: AccountTypeService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AccountTypeController>(AccountTypeController);
    service = module.get<AccountTypeService>(AccountTypeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of account types', async () => {
      const result = [new AccountTypeDto()];
      jest.spyOn(service, 'findAll').mockResolvedValue(result);

      expect(await controller.findAll(FindAllOptions.SHOW_ONLY_ACTIVE)).toBe(
        result,
      );
    });
  });

  describe('findOne', () => {
    it('should return a single account type', async () => {
      const result = new AccountTypeDto();
      jest.spyOn(service, 'findOne').mockResolvedValue(result);

      expect(await controller.findOne(1)).toBe(result);
    });
  });

  describe('update', () => {
    it('should update account types and return the updated entities', async () => {
      const updateDto: UpdateAccountTypeDto[] = [];
      const result = [new AccountType()];
      jest.spyOn(service, 'update').mockResolvedValue(result);

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.update(res as any, updateDto);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('should throw an error if update fails', async () => {
      const updateDto: UpdateAccountTypeDto[] = [];
      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new Error('Update failed'));

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await expect(controller.update(res as any, updateDto)).rejects.toThrow(
        'Update failed',
      );
    });
  });
});
