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
import { Response } from 'express';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

import { AccountTypeService } from './account-type.service';
import { UpdateAccountTypeDto } from './dto/update-account-type.dto';
import { AccountType } from './entities/account-type.entity';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AccountTypeDto } from './dto/account-type.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Account Types')
export class AccountTypeController {
  constructor(private readonly accountTypeService: AccountTypeService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all account types. Defaults to active.',
  })
  @ApiOkResponse({ type: [AccountTypeDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.accountTypeService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the account type',
  })
  @ApiOkResponse({ type: [AccountTypeDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.accountTypeService.findOne(id);
  }

  @Patch('update')
  @ApiExcludeEndpoint()
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
