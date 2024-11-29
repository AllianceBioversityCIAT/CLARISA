import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account } from './entities/account.entity';
import { HttpStatus, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { AccountDto } from './dto/account.dto';

describe('AccountController', () => {
  let controller: AccountController;
  let service: AccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        {
          provide: AccountService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AccountController>(AccountController);
    service = module.get<AccountService>(AccountService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of accounts', async () => {
      const result = [new AccountDto()];
      jest.spyOn(service, 'findAll').mockResolvedValue(result);

      expect(await controller.findAll(FindAllOptions.SHOW_ONLY_ACTIVE)).toBe(
        result,
      );
    });
  });

  describe('findOne', () => {
    it('should return a single account', async () => {
      const result = new AccountDto();
      jest.spyOn(service, 'findOne').mockResolvedValue(result);

      expect(await controller.findOne(1)).toBe(result);
    });
  });

  describe('update', () => {
    it('should update accounts and return the updated accounts', async () => {
      const result = [new Account()];
      const updateAccountDtoList: UpdateAccountDto[] = [];
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      jest.spyOn(service, 'update').mockResolvedValue(result);

      await controller.update(res, updateAccountDtoList);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('should throw an HttpException if update fails', async () => {
      const updateAccountDtoList: UpdateAccountDto[] = [];
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new Error('Update failed'));

      await expect(
        controller.update(res, updateAccountDtoList),
      ).rejects.toThrow(
        new HttpException('Update failed', HttpStatus.BAD_REQUEST),
      );
    });
  });
});
