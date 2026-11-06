import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { PolicyTypeService } from '../policy-type/policy-type.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdatePolicyTypeDto } from '../policy-type/dto/update-policy-type.dto';
import { PolicyType } from '../policy-type/entities/policy-type.entity';
import { Response } from 'express';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class PolicyTypeController {
  constructor(private readonly policyTypeService: PolicyTypeService) {}

  @Get()
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.policyTypeService.findAll(show, type);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.policyTypeService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updatePolicyTypeDtoList: UpdatePolicyTypeDto[],
  ) {
    try {
      const result: PolicyType[] = await this.policyTypeService.update(
        updatePolicyTypeDtoList,
      );
      res.status(HttpStatus.OK).json(result);
      return;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
