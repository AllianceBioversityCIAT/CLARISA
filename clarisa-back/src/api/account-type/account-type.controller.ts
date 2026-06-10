import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  ClassSerializerInterceptor,
  UseInterceptors,
  Query,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

import { AccountTypeService } from './account-type.service';
import { UpdateAccountTypeDto } from './dto/update-account-type.dto';
import { AccountType } from './entities/account-type.entity';

@ApiTags('Account Type')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class AccountTypeController {
  constructor(private readonly accountTypeService: AccountTypeService) {}

  @Get()
  @ApiOperation({
    summary: 'List account types',
    description: 'Types used to classify One CGIAR accounts.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.accountTypeService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.accountTypeService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateUserDtoList: UpdateAccountTypeDto[],
  ) {
    try {
      const result: AccountType[] =
        await this.accountTypeService.update(updateUserDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
