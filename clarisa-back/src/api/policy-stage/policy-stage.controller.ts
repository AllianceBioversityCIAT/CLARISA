import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { PolicyStageService } from './policy-stage.service';
import { UpdatePolicyStageDto } from './dto/update-policy-stage.dto';
import { Response } from 'express';
import { PolicyStage } from './entities/policy-stage.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class PolicyStageController {
  constructor(private readonly policyStageService: PolicyStageService) {}

  @Get()
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('type') type: string,
  ) {
    return await this.policyStageService.findAll(show, type);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.policyStageService.findOne(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updatePolicyStageDtoList: UpdatePolicyStageDto[],
  ) {
    try {
      const result: PolicyStage[] = await this.policyStageService.update(
        updatePolicyStageDtoList,
      );
      res.status(HttpStatus.OK).json(result);
      return;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
